import { confirmBalance, recordPayment, updateMovement } from '../../actions/financial';
import {
  db,
  confirmedBalance,
  financialMovement,
  financialPayment,
  recurrenceRuleVersion,
} from '@organizei/database';
import { eq, desc, inArray } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import Link from 'next/link';
import {
  calculateDailyProjectionWithPayments,
  calculateMonthlyProjectionWithPayments,
  toCivilDate,
} from '@organizei/domain';
import type { DailyProjection } from '@organizei/domain';
import { revalidatePath } from 'next/cache';
import { ThemeToggle } from '../../components/theme-toggle';
import { LogoutButton } from '../../components/logout-button';
import { FinancialMovementDialogs } from '../../components/financial-movement-dialogs';
import { FinancialPaymentForm } from '../../components/financial-payment-form';
import { auth } from '../../lib/auth';
import { materializeSpaceRecurrencesCore } from '../../lib/financial-core';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);
const formatDate = (date: string) => dateFormatter.format(new Date(`${date}T12:00:00Z`));
const formatMonth = (month: string) => monthFormatter.format(new Date(`${month}-01T12:00:00Z`));

export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect('/login');
  }
  const user = session.user;

  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, user.id),
  });

  if (!membership) {
    return (
      <main className="bg-background text-text flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-xl font-medium">Sem Espaço Familiar</h1>
        <p className="text-text-muted mt-2 text-sm">
          Você precisa ser adicionado a um espaço familiar.
        </p>
        <div className="mt-6 flex items-center gap-4">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </main>
    );
  }

  const spaceId = membership.spaceId;
  const todayCivil = toCivilDate(new Date(), 'America/Maceio');
  const materializationHorizon = new Date(`${todayCivil}T00:00:00Z`);
  materializationHorizon.setUTCFullYear(materializationHorizon.getUTCFullYear() + 1);
  await materializeSpaceRecurrencesCore(
    spaceId,
    materializationHorizon.toISOString().slice(0, 10),
    user.id,
  );

  // 1. Fetch confirmed balances and movements
  const lastBalance = await db.query.confirmedBalance.findFirst({
    where: eq(confirmedBalance.spaceId, spaceId),
    orderBy: desc(confirmedBalance.confirmedAt),
  });

  const movements = await db.query.financialMovement.findMany({
    where: eq(financialMovement.spaceId, spaceId),
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

  // 2. Map schema objects to core domain structures
  const normalizedMovements = movements.map((m) => ({
    id: m.id,
    spaceId: m.spaceId,
    description: m.description,
    direction: m.direction as 'income' | 'expense',
    expectedAmountCents: m.expectedAmountCents,
    plannedDate: m.plannedDate,
    status: m.status as 'pending' | 'realized' | 'canceled',
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

  const activeBalance = lastBalance
    ? {
        spaceId: lastBalance.spaceId,
        amountCents: lastBalance.amountCents,
        confirmedAt: lastBalance.confirmedAt,
        authorId: lastBalance.authorId,
        createdAt: lastBalance.createdAt,
      }
    : {
        spaceId,
        amountCents: 0,
        confirmedAt: new Date(todayCivil + 'T00:00:00Z'),
        authorId: user.id,
        createdAt: new Date(),
      };

  // 3. Compute projection
  const horizonDays = 30;
  const projection = calculateDailyProjectionWithPayments(
    activeBalance,
    todayCivil,
    normalizedMovements,
    payments,
    horizonDays,
  );

  const todayBalanceCents = projection.daily[0]?.balanceCents ?? activeBalance.amountCents;
  const monthlyProjection = calculateMonthlyProjectionWithPayments(
    activeBalance,
    todayCivil,
    normalizedMovements,
    payments,
  );
  const projectedBalances = new Map(projection.daily.map((day) => [day.date, day.balanceCents]));
  const timelineGroups = new Map<string, typeof normalizedMovements>();
  for (const movement of normalizedMovements) {
    const date =
      movement.status === 'realized'
        ? (movement.realizedDate ?? movement.plannedDate)
        : movement.status === 'pending' && movement.plannedDate < todayCivil
          ? todayCivil
          : movement.plannedDate;
    timelineGroups.set(date, [...(timelineGroups.get(date) ?? []), movement]);
  }
  const timelineDays = [...timelineGroups.entries()].sort(([first], [second]) =>
    first < second ? 1 : -1,
  );

  // Actions
  async function handleConfirmBalance(formData: FormData) {
    'use server';
    const amount = parseFloat(formData.get('amount') as string);
    if (isNaN(amount) || amount < 0) return;
    const amountCents = Math.round(amount * 100);
    await confirmBalance(spaceId, amountCents);
    revalidatePath('/app');
  }

  async function handleCancelMovement(formData: FormData) {
    'use server';
    const movementId = formData.get('movementId') as string;
    const version = parseInt(formData.get('version') as string);
    await updateMovement(
      spaceId,
      movementId,
      {
        status: 'canceled',
      },
      version,
    );
    revalidatePath('/app');
  }

  async function handleRealizeMovement(formData: FormData) {
    'use server';
    const movementId = String(formData.get('movementId'));
    const version = Number(formData.get('version'));
    const movement = movements.find((item) => item.id === movementId);
    if (!movement) return;
    const paid = payments
      .filter((payment) => payment.movementId === movementId)
      .reduce((total, payment) => total + payment.amountCents, 0);
    const remaining = movement.expectedAmountCents - paid;
    if (remaining > 0) await recordPayment(spaceId, movementId, remaining, todayCivil, version);
    revalidatePath('/app');
  }

  return (
    <main className="bg-background text-text mx-auto flex min-h-screen max-w-md flex-col gap-6 p-4">
      <header className="border-border flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Organizei</h1>
          <p className="text-text-muted text-xs">Espaço familiar compartilhado</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      {/* Saldo Calculado e Próximos Eventos */}
      <section className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
        <div>
          <span className="text-text-muted text-xs uppercase tracking-wider">
            Saldo Atual Projetado
          </span>
          <p className="mt-1 text-3xl font-semibold">{formatMoney(todayBalanceCents)}</p>
          <p className="text-text-muted mt-1 text-xs">
            Menor saldo nos próximos 30 dias: {formatMoney(projection.lowestBalanceCents)}
          </p>
          {lastBalance ? (
            <p className="text-xxs text-text-muted mt-1">
              Último checkpoint de {formatMoney(lastBalance.amountCents)} em{' '}
              {formatDate(toCivilDate(lastBalance.confirmedAt))}
            </p>
          ) : (
            <p className="text-xxs text-text-muted mt-1">Sem checkpoint de saldo confirmado.</p>
          )}
        </div>

        {/* Novo Checkpoint inline */}
        <form action={handleConfirmBalance} className="mt-2 flex gap-2">
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            placeholder="Ajustar saldo (R$)"
            required
            className="border-border bg-background text-text flex-1 rounded border p-2 text-sm"
          />
          <button
            type="submit"
            className="bg-primary rounded px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            Confirmar
          </button>
        </form>
      </section>

      <section aria-labelledby="monthly-projection-title">
        <h2
          id="monthly-projection-title"
          className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-wider"
        >
          Planejamento mensal (12 meses)
        </h2>
        <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded border">
          {monthlyProjection.map((month) => (
            <div key={month.month} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="capitalize">{formatMonth(month.month)}</span>
              <span
                className={month.balanceCents < 0 ? 'text-danger font-semibold' : 'font-semibold'}
              >
                {formatMoney(month.balanceCents)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Projeção Diária de 30 dias */}
      <section>
        <h2 className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-wider">
          Projeção Diária (30 dias)
        </h2>
        {projection.firstNegativeDate && (
          <div className="border-danger bg-danger/10 text-danger mb-3 rounded border p-3 text-xs">
            Atenção: Saldo projetado ficará negativo a partir de{' '}
            {formatDate(projection.firstNegativeDate)}. Menor saldo previsto:{' '}
            {formatMoney(projection.lowestBalanceCents)}
          </div>
        )}
        <div
          tabIndex={0}
          aria-label="Linha do tempo da projeção diária de saldo"
          className="scrollbar-thin focus:ring-primary flex gap-2 overflow-x-auto pb-2 focus:outline-none focus:ring-1"
        >
          {projection.daily.map((day: DailyProjection) => {
            const isNegative = day.balanceCents < 0;
            return (
              <div
                key={day.date}
                className={`flex min-w-[100px] flex-col items-center rounded border p-2 text-center transition-colors ${
                  isNegative ? 'border-danger bg-danger/10 text-danger' : 'border-border bg-surface'
                }`}
              >
                <span className="text-xxs text-text-muted">{formatDate(day.date)}</span>
                <span className="mt-1 text-sm font-semibold">{formatMoney(day.balanceCents)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Linha do tempo de movimentações */}
      <section className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-text-muted text-xs font-semibold uppercase tracking-wider">
            Linha do Tempo
          </h2>
          <Link
            href="/add"
            className="bg-primary rounded px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            + Movimentação
          </Link>
        </div>

        {normalizedMovements.length === 0 ? (
          <div className="border-border text-text-muted bg-surface rounded border border-dashed py-8 text-center text-xs">
            Nenhuma movimentação cadastrada.
          </div>
        ) : (
          <div className="space-y-4">
            {timelineDays.map(([date, dayMovements]) => (
              <section
                key={date}
                aria-label={`Movimentações de ${formatDate(date)}`}
                className="space-y-2"
              >
                <header className="text-text-muted flex items-center justify-between text-xs">
                  <span>{formatDate(date)}</span>
                  {projectedBalances.has(date) && (
                    <span>Saldo ao fim do dia: {formatMoney(projectedBalances.get(date)!)}</span>
                  )}
                </header>
                {dayMovements.map((mov) => {
                  const isIncome = mov.direction === 'income';
                  const isRealized = mov.status === 'realized';
                  const isCanceled = mov.status === 'canceled';
                  const paidCents = payments
                    .filter((payment) => payment.movementId === mov.id)
                    .reduce((total, payment) => total + payment.amountCents, 0);
                  const remainingCents = mov.expectedAmountCents - paidCents;
                  const displayAmount = isRealized
                    ? (mov.realizedAmountCents ?? mov.expectedAmountCents)
                    : mov.expectedAmountCents;

                  return (
                    <div
                      key={mov.id}
                      className="border-border bg-surface flex flex-col gap-3 rounded border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col gap-0.5">
                        <p className="text-text text-sm font-medium">{mov.description}</p>
                        <p className="text-xxs text-text-muted">
                          {isIncome ? 'Receita' : 'Despesa'} • {formatDate(mov.plannedDate)}
                          {isRealized &&
                            mov.realizedDate &&
                            ` • Realizado em ${formatDate(mov.realizedDate)}`}
                        </p>
                        {paidCents > 0 && !isRealized && (
                          <p className="text-xxs text-warning">
                            Restam {formatMoney(remainingCents)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span
                          className={`text-sm font-semibold ${isIncome ? 'text-positive' : 'text-danger'}`}
                        >
                          {isIncome ? '+ ' : '- '}
                          {formatMoney(displayAmount)}
                        </span>
                        <span
                          className={`text-xxs rounded-full px-2 py-0.5 font-medium ${
                            isRealized
                              ? 'bg-positive/20 text-positive'
                              : isCanceled
                                ? 'bg-surface-elevated text-text-muted'
                                : 'bg-warning/20 text-warning'
                          }`}
                        >
                          {isRealized ? 'Realizado' : isCanceled ? 'Cancelado' : 'Pendente'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {!isRealized && !isCanceled && (
                            <FinancialPaymentForm
                              spaceId={spaceId}
                              movementId={mov.id}
                              version={mov.version}
                              description={mov.description}
                              paidDate={todayCivil}
                              remainingCents={remainingCents}
                            />
                          )}
                          {!isRealized && !isCanceled && remainingCents > 0 && (
                            <form action={handleRealizeMovement}>
                              <input type="hidden" name="movementId" value={mov.id} />
                              <input type="hidden" name="version" value={mov.version} />
                              <button
                                type="submit"
                                className="border-border bg-background text-text hover:bg-surface-elevated min-h-11 rounded border px-3 text-xs font-semibold"
                              >
                                Realizar
                              </button>
                            </form>
                          )}
                          {!isRealized && !isCanceled && (
                            <FinancialMovementDialogs
                              spaceId={spaceId}
                              movement={{
                                id: mov.id,
                                recurrenceRuleVersionId: mov.recurrenceRuleVersionId,
                                cadence: mov.recurrenceRuleVersionId
                                  ? (recurrenceById.get(mov.recurrenceRuleVersionId)?.cadence ??
                                    'monthly')
                                  : null,
                                version: mov.version,
                                description: mov.description,
                                direction: mov.direction,
                                expectedAmountCents: mov.expectedAmountCents,
                                plannedDate: mov.plannedDate,
                              }}
                            />
                          )}
                          {!isRealized && !isCanceled && (
                            <form action={handleCancelMovement}>
                              <input type="hidden" name="movementId" value={mov.id} />
                              <input type="hidden" name="version" value={mov.version} />
                              <button
                                type="submit"
                                className="border-border bg-background text-xxs hover:bg-surface-elevated text-danger rounded border px-2 py-1 transition-colors"
                              >
                                Cancelar
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
