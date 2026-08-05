export type Direction = 'income' | 'expense';
export type MovementStatus = 'pending' | 'realized' | 'canceled';

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
