export type Direction = 'income' | 'expense';
export type MovementStatus = 'pending' | 'realized' | 'canceled';
export type RecurrenceCadence = 'weekly' | 'monthly';

export interface FamilySpace {
  id: string;
  name: string;
  createdAt: Date;
}

export interface FamilyMembership {
  id: string;
  spaceId: string;
  userId: string;
  role: 'member' | 'admin';
}

export interface ConfirmedBalance {
  spaceId: string;
  amountCents: number;
  confirmedAt: Date;
  authorId: string;
  createdAt: Date;
}

export interface FinancialMovement {
  id: string;
  spaceId: string;
  description: string;
  direction: Direction;
  expectedAmountCents: number;
  plannedDate: string;
  status: MovementStatus;

  realizedAmountCents?: number | null;
  realizedDate?: string | null;
  categoryId?: string | null;
  responsibleUserIds?: string[];

  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface DailyProjection {
  date: string;
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
}

export interface ProjectionResult {
  daily: DailyProjection[];
  lowestBalanceCents: number;
  firstNegativeDate: string | null;
}

export interface RecurrenceRuleVersion {
  id: string;
  seriesId: string;
  version: number;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  maxOccurrences?: number | null;
  description: string;
  direction: Direction;
  expectedAmountCents: number;
  cadence: RecurrenceCadence;
}

export interface FinancialPayment {
  id: string;
  movementId: string;
  amountCents: number;
  paidDate: string;
}

export interface MonthlyProjection {
  month: string;
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
}

/**
 * Normalizes a date to YYYY-MM-DD in the specified timezone
 */
export function toCivilDate(date: Date, timeZone: string = 'America/Maceio'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function calculateDailyProjection(
  confirmedBalance: ConfirmedBalance,
  currentCivilDate: string,
  movements: FinancialMovement[],
  horizonDays: number,
): ProjectionResult {
  const checkpointCivilDate = toCivilDate(confirmedBalance.confirmedAt);

  // Create horizon dates
  const days: DailyProjection[] = [];
  const start = new Date(`${currentCivilDate}T00:00:00Z`);
  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    days.push({
      date: d.toISOString().split('T')[0]!,
      balanceCents: 0, // will calculate cumulatively
      incomeCents: 0,
      expenseCents: 0,
    });
  }

  // Aggregate movements
  const dailyAgg = new Map<string, { income: number; expense: number }>();

  for (const mov of movements) {
    if (mov.status === 'canceled') continue;

    let effectiveDate: string;
    let effectiveAmount: number;

    if (mov.status === 'realized') {
      if (!mov.realizedDate) continue; // invalid state, but defensive
      if (mov.realizedDate <= checkpointCivilDate) {
        // Assume already included in the checkpoint if it was realized on or before the checkpoint day
        continue;
      }
      effectiveDate = mov.realizedDate;
      effectiveAmount = mov.realizedAmountCents ?? mov.expectedAmountCents;
    } else {
      // pending
      effectiveDate = mov.plannedDate;
      effectiveAmount = mov.expectedAmountCents;

      // If overdue, project it today
      if (effectiveDate < currentCivilDate) {
        effectiveDate = currentCivilDate;
      }
    }

    if (!dailyAgg.has(effectiveDate)) {
      dailyAgg.set(effectiveDate, { income: 0, expense: 0 });
    }
    const agg = dailyAgg.get(effectiveDate)!;
    if (mov.direction === 'income') {
      agg.income += effectiveAmount;
    } else {
      agg.expense += effectiveAmount;
    }
  }

  // Calculate balances
  let currentBalance = confirmedBalance.amountCents;
  let lowestBalance = currentBalance;
  let firstNegativeDate: string | null = null;

  // We need to apply movements between the checkpoint and current day that are not in the horizon
  // Wait, the horizon starts at `currentCivilDate`. What about days between `checkpointCivilDate` and `currentCivilDate` - 1?
  // We must calculate the balance leading up to current day.
  const allDates = Array.from(dailyAgg.keys()).sort();

  let preHorizonBalance = currentBalance;
  for (const date of allDates) {
    if (date < currentCivilDate) {
      const agg = dailyAgg.get(date)!;
      preHorizonBalance += agg.income - agg.expense;
    }
  }

  let runningBalance = preHorizonBalance;

  for (const day of days) {
    const agg = dailyAgg.get(day.date) || { income: 0, expense: 0 };
    day.incomeCents = agg.income;
    day.expenseCents = agg.expense;

    runningBalance += agg.income - agg.expense;
    day.balanceCents = runningBalance;

    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance;
    }

    if (runningBalance < 0 && !firstNegativeDate) {
      firstNegativeDate = day.date;
    }
  }

  return {
    daily: days,
    lowestBalanceCents: lowestBalance,
    firstNegativeDate,
  };
}

/** Projects paid cash events separately from each occurrence's still-open balance. */
export function calculateDailyProjectionWithPayments(
  confirmedBalance: ConfirmedBalance,
  currentCivilDate: string,
  movements: FinancialMovement[],
  payments: FinancialPayment[],
  horizonDays: number,
): ProjectionResult {
  const paymentsByMovement = new Map<string, FinancialPayment[]>();
  for (const payment of payments) {
    paymentsByMovement.set(payment.movementId, [
      ...(paymentsByMovement.get(payment.movementId) ?? []),
      payment,
    ]);
  }
  const events: FinancialMovement[] = [];
  for (const movement of movements) {
    if (movement.status === 'canceled') continue;
    const movementPayments = paymentsByMovement.get(movement.id) ?? [];
    if (movement.status === 'realized' && movementPayments.length === 0) {
      events.push(movement);
      continue;
    }
    const remaining = remainingAmountCents(movement.expectedAmountCents, movementPayments);
    for (const payment of movementPayments) {
      events.push({
        ...movement,
        id: payment.id,
        expectedAmountCents: payment.amountCents,
        plannedDate: payment.paidDate,
        status: 'realized',
        realizedAmountCents: payment.amountCents,
        realizedDate: payment.paidDate,
      });
    }
    if (movement.status === 'pending' && remaining > 0) {
      events.push({
        ...movement,
        id: `${movement.id}:remaining`,
        expectedAmountCents: remaining,
        status: 'pending',
        realizedAmountCents: null,
        realizedDate: null,
      });
    }
  }
  return calculateDailyProjection(confirmedBalance, currentCivilDate, events, horizonDays);
}

function addCivilDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function addCivilMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const monthStart = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), Math.min(day, lastDay)),
  )
    .toISOString()
    .slice(0, 10);
}

/** Generates dates without persisting them; callers materialize only their required horizon. */
export function generateRecurrenceDates(rule: RecurrenceRuleVersion, horizonEnd: string): string[] {
  if (
    rule.maxOccurrences !== undefined &&
    rule.maxOccurrences !== null &&
    rule.maxOccurrences < 1
  ) {
    throw new Error('A recorrência deve ter ao menos uma ocorrência.');
  }
  const finalDate = [horizonEnd, rule.effectiveUntil].filter(Boolean).sort()[0]!;
  const dates: string[] = [];
  for (let sequence = 1; ; sequence += 1) {
    if (rule.maxOccurrences && sequence > rule.maxOccurrences) break;
    const current =
      rule.cadence === 'weekly'
        ? addCivilDays(rule.effectiveFrom, (sequence - 1) * 7)
        : addCivilMonths(rule.effectiveFrom, sequence - 1);
    if (current > finalDate) break;
    dates.push(current);
  }
  return dates;
}

export function paymentTotalCents(payments: FinancialPayment[]): number {
  return payments.reduce((total, payment) => total + payment.amountCents, 0);
}

export function remainingAmountCents(
  expectedAmountCents: number,
  payments: FinancialPayment[],
): number {
  const paid = paymentTotalCents(payments);
  if (paid > expectedAmountCents)
    throw new Error('Pagamentos não podem ultrapassar o valor previsto.');
  return expectedAmountCents - paid;
}

export function calculateMonthlyProjection(
  confirmedBalance: ConfirmedBalance,
  currentCivilDate: string,
  movements: FinancialMovement[],
  months: number = 12,
): MonthlyProjection[] {
  const horizonDays = Math.max(1, months * 31);
  const daily = calculateDailyProjection(
    confirmedBalance,
    currentCivilDate,
    movements,
    horizonDays,
  ).daily;
  const grouped = new Map<string, MonthlyProjection>();
  for (const day of daily) {
    const month = day.date.slice(0, 7);
    const current = grouped.get(month) ?? {
      month,
      balanceCents: day.balanceCents,
      incomeCents: 0,
      expenseCents: 0,
    };
    current.balanceCents = day.balanceCents;
    current.incomeCents += day.incomeCents;
    current.expenseCents += day.expenseCents;
    grouped.set(month, current);
  }
  return [...grouped.values()].slice(0, months);
}

export function calculateMonthlyProjectionWithPayments(
  confirmedBalance: ConfirmedBalance,
  currentCivilDate: string,
  movements: FinancialMovement[],
  payments: FinancialPayment[],
  months: number = 12,
): MonthlyProjection[] {
  const horizonDays = Math.max(1, months * 31);
  const daily = calculateDailyProjectionWithPayments(
    confirmedBalance,
    currentCivilDate,
    movements,
    payments,
    horizonDays,
  ).daily;
  const grouped = new Map<string, MonthlyProjection>();
  for (const day of daily) {
    const month = day.date.slice(0, 7);
    const value = grouped.get(month) ?? {
      month,
      balanceCents: day.balanceCents,
      incomeCents: 0,
      expenseCents: 0,
    };
    value.balanceCents = day.balanceCents;
    value.incomeCents += day.incomeCents;
    value.expenseCents += day.expenseCents;
    grouped.set(month, value);
  }
  return [...grouped.values()].slice(0, months);
}
