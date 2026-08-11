import {
  confirmedBalance,
  db,
  financialMovement,
  financialPayment,
  recurrenceRuleVersion,
} from '@organizei/database';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import {
  calculateCashSummary,
  calculateDailyProjectionWithPayments,
  calculateMonthlyProjectionWithPayments,
  toCivilDate,
} from '@organizei/domain';
import { materializeSpaceRecurrencesCore } from './financial-core';

export async function getDashboardData(
  spaceId: string,
  userId: string,
  today = toCivilDate(new Date(), 'America/Maceio'),
) {
  const materializationHorizon = new Date(`${today}T00:00:00Z`);
  materializationHorizon.setUTCFullYear(materializationHorizon.getUTCFullYear() + 1);
  await materializeSpaceRecurrencesCore(
    spaceId,
    materializationHorizon.toISOString().slice(0, 10),
    userId,
  );

  const lastBalance = await db.query.confirmedBalance.findFirst({
    where: eq(confirmedBalance.spaceId, spaceId),
    orderBy: desc(confirmedBalance.confirmedAt),
  });
  const movements = await db.query.financialMovement.findMany({
    where: and(eq(financialMovement.spaceId, spaceId), ne(financialMovement.status, 'canceled')),
    orderBy: desc(financialMovement.plannedDate),
  });
  const payments = movements.length
    ? await db.query.financialPayment.findMany({
        where: inArray(
          financialPayment.movementId,
          movements.map((movement) => movement.id),
        ),
      })
    : [];
  const recurrenceRuleIds = movements.flatMap((movement) =>
    movement.recurrenceRuleVersionId ? [movement.recurrenceRuleVersionId] : [],
  );
  const recurrenceRules = recurrenceRuleIds.length
    ? await db.query.recurrenceRuleVersion.findMany({
        where: inArray(recurrenceRuleVersion.id, recurrenceRuleIds),
      })
    : [];
  const recurrenceById = new Map(recurrenceRules.map((rule) => [rule.id, rule]));
  const normalizedMovements = movements.map((m) => ({
    id: m.id,
    spaceId: m.spaceId,
    description: m.description,
    direction: m.direction as 'income' | 'expense',
    expectedAmountCents: m.expectedAmountCents,
    plannedDate: m.plannedDate,
    status: m.status as 'pending' | 'realized',
    realizedAmountCents: m.realizedAmountCents,
    realizedDate: m.realizedDate,
    categoryId: m.categoryId,
    recurrenceRuleVersionId: m.recurrenceRuleVersionId,
    createdBy: m.createdBy,
    updatedBy: m.updatedBy,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    version: m.version,
  }));
  const activeBalance = lastBalance ?? {
    spaceId,
    amountCents: 0,
    confirmedAt: new Date(`${today}T00:00:00Z`),
    authorId: userId,
    createdAt: new Date(),
  };
  const projection = calculateDailyProjectionWithPayments(
    activeBalance,
    today,
    normalizedMovements,
    payments,
    30,
  );
  const monthlyProjection = calculateMonthlyProjectionWithPayments(
    activeBalance,
    today,
    normalizedMovements,
    payments,
  );
  const recentMovements = normalizedMovements.slice(0, 5);
  const monthlyTotals = new Map<string, { incomeCents: number; expenseCents: number }>();
  for (const movement of normalizedMovements) {
    const month = movement.plannedDate.slice(0, 7);
    const totals = monthlyTotals.get(month) ?? { incomeCents: 0, expenseCents: 0 };
    totals[movement.direction === 'income' ? 'incomeCents' : 'expenseCents'] +=
      movement.expectedAmountCents;
    monthlyTotals.set(month, totals);
  }
  return {
    today,
    lastBalance,
    activeBalance,
    movements,
    normalizedMovements,
    payments,
    recurrenceById,
    projection,
    cashSummary: calculateCashSummary(activeBalance, today, normalizedMovements, payments),
    monthlyProjection,
    monthlyTotals,
    recentMovements,
  };
}
