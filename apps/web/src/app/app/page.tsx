import { confirmBalance, recordPayment, updateMovement } from '../../actions/financial';
import { db, familyMembership } from '@organizei/database';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { toCivilDate } from '@organizei/domain';
import type { DailyProjection } from '@organizei/domain';
import { revalidatePath } from 'next/cache';
import { ThemeToggle } from '../../components/theme-toggle';
import { LogoutButton } from '../../components/logout-button';
import { FinancialMovementDialogs } from '../../components/financial-movement-dialogs';
import { FinancialPaymentForm } from '../../components/financial-payment-form';
import { auth } from '../../lib/auth';
import { getDashboardData } from '../../lib/dashboard-data';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { matchesTimelineFilters, parseTimelineFilters } from '../../lib/financial-filters';
import { EmptyState, StatusBadge } from '@organizei/ui';
import { ForecastChart } from '../../components/forecast-chart';
import { AppNavigation } from '../../components/app-navigation';
import { AppPageHeader } from '../../components/app-page-header';

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

type DashboardProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Dashboard({ searchParams }: DashboardProps) {
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
  const data = await getDashboardData(spaceId, user.id);
  const {
    today: todayCivil,
    lastBalance,
    activeBalance,
    movements,
    normalizedMovements,
    payments,
    recurrenceById,
    projection,
    monthlyProjection,
    monthlyTotals,
  } = data;
  const safeLastBalance = lastBalance ?? null;
  const todayBalanceCents = projection.daily[0]?.balanceCents ?? activeBalance.amountCents;
  const projectedBalances = new Map(projection.daily.map((day) => [day.date, day.balanceCents]));
  const timelineFilters = parseTimelineFilters((await searchParams) ?? {});
  const timelineGroups = new Map<string, typeof normalizedMovements>();
  for (const movement of normalizedMovements) {
    if (!matchesTimelineFilters(movement, timelineFilters, todayCivil)) continue;
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

  return <OverviewDashboard data={data} />;

  return (
    <main className="bg-background text-text mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 overflow-x-clip p-4 sm:p-6">
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
          {safeLastBalance ? (
            <p className="text-xxs text-text-muted mt-1">
              Último checkpoint de {formatMoney(safeLastBalance!.amountCents)} em{' '}
              {formatDate(toCivilDate(safeLastBalance!.confirmedAt))}
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
          {monthlyProjection.map((month) => {
            const totals = monthlyTotals.get(month.month) ?? { incomeCents: 0, expenseCents: 0 };
            return (
              <div
                key={month.month}
                className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="capitalize">{formatMonth(month.month)}</span>
                <span className="text-text-muted text-xs">
                  +{formatMoney(totals.incomeCents)} · -{formatMoney(totals.expenseCents)}
                </span>
                <span
                  className={month.balanceCents < 0 ? 'text-danger font-semibold' : 'font-semibold'}
                >
                  Saldo {formatMoney(month.balanceCents)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-text-muted mt-2 text-xs">
          Entradas e saídas previstas no mês; o saldo inclui pagamentos e movimentações realizadas.
        </p>
      </section>

      {/* Projeção Diária de 30 dias */}
      <section>
        <h2 className="text-text-muted mb-3 text-xs font-semibold uppercase tracking-wider">
          Projeção Diária (30 dias)
        </h2>
        {projection.firstNegativeDate && (
          <div className="border-danger bg-danger/10 text-danger mb-3 rounded border p-3 text-xs">
            Atenção: Saldo projetado ficará negativo a partir de{' '}
            {formatDate(projection.firstNegativeDate!)}. Menor saldo previsto:{' '}
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

        <form
          method="get"
          className="border-border bg-surface mb-4 grid gap-3 rounded border p-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-xs font-medium sm:col-span-2 lg:col-span-2">
            Buscar descrição ou valor
            <input
              name="q"
              defaultValue={timelineFilters.query}
              placeholder="Ex.: aluguel ou 1.250,00"
              className="border-border bg-background text-text mt-1 min-h-11 w-full rounded border px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Situação
            <select
              name="status"
              defaultValue={timelineFilters.status}
              className="border-border bg-background text-text mt-1 min-h-11 w-full rounded border px-3 text-sm"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendente</option>
              <option value="realized">Realizado</option>
              <option value="canceled">Cancelado</option>
              <option value="overdue">Vencido</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Tipo
            <select
              name="direction"
              defaultValue={timelineFilters.direction}
              className="border-border bg-background text-text mt-1 min-h-11 w-full rounded border px-3 text-sm"
            >
              <option value="all">Todos</option>
              <option value="income">Entradas</option>
              <option value="expense">Saídas</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            De
            <input
              type="date"
              name="from"
              defaultValue={timelineFilters.from}
              className="border-border bg-background text-text mt-1 min-h-11 w-full rounded border px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Até
            <input
              type="date"
              name="to"
              defaultValue={timelineFilters.to}
              className="border-border bg-background text-text mt-1 min-h-11 w-full rounded border px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Valor mínimo
            <input
              name="min"
              defaultValue={
                timelineFilters.minAmountCents === null
                  ? ''
                  : ((timelineFilters.minAmountCents ?? 0) / 100).toFixed(2).replace('.', ',')
              }
              inputMode="decimal"
              placeholder="R$ 0,00"
              className="border-border bg-background text-text mt-1 min-h-11 w-full rounded border px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Valor máximo
            <input
              name="max"
              defaultValue={
                timelineFilters.maxAmountCents === null
                  ? ''
                  : ((timelineFilters.maxAmountCents ?? 0) / 100).toFixed(2).replace('.', ',')
              }
              inputMode="decimal"
              placeholder="R$ 0,00"
              className="border-border bg-background text-text mt-1 min-h-11 w-full rounded border px-3 text-sm"
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="bg-primary min-h-11 rounded px-4 text-sm font-semibold text-white"
            >
              Aplicar filtros
            </button>
            <Link
              href="/app"
              className="border-border bg-background text-text min-h-11 rounded border px-4 py-2 text-sm"
            >
              Limpar
            </Link>
          </div>
        </form>

        {normalizedMovements.length === 0 ? (
          <EmptyState>Nenhuma movimentação cadastrada.</EmptyState>
        ) : timelineDays.length === 0 ? (
          <EmptyState>Nenhuma movimentação encontrada. Tente ajustar os filtros.</EmptyState>
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
                  const isOverdue = mov.status === 'pending' && mov.plannedDate < todayCivil;
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
                        <StatusBadge
                          tone={isRealized ? 'positive' : isCanceled ? 'neutral' : 'warning'}
                        >
                          {isRealized
                            ? 'Realizado'
                            : isCanceled
                              ? 'Cancelado'
                              : isOverdue
                                ? 'Vencido'
                                : 'Pendente'}
                        </StatusBadge>
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

function OverviewDashboard({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const todayBalanceCents =
    data.projection.daily[0]?.balanceCents ?? data.activeBalance.amountCents;
  const chartData = data.projection.daily.slice(0, 8).map((day) => ({
    date: day.date,
    label: formatDate(day.date).slice(0, 5),
    balanceCents: day.balanceCents,
  }));
  const attention = data.projection.firstNegativeDate;
  return (
    <main className="bg-background text-text min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-8 sm:py-8">
        <AppPageHeader
          title="Visão geral"
          description="Seu saldo, os próximos movimentos e os atalhos mais usados."
          context="Planejamento familiar"
        />
        <AppNavigation />

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="bg-primary rounded-3xl p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm text-white/85">Saldo disponível</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatMoney(data.activeBalance.amountCents)}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/80">
              <span>Hoje, após o planejado: {formatMoney(todayBalanceCents)}</span>
              <span className="text-white/40">•</span>
              <span>
                Menor saldo previsto (30 dias): {formatMoney(data.projection.lowestBalanceCents)}
              </span>
            </div>
            {attention && (
              <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">
                O saldo pode ficar negativo em {formatDate(attention)}. Revise as próximas
                movimentações.
              </p>
            )}
          </article>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/add"
              className="border-border bg-surface text-text hover:bg-surface-elevated flex min-h-32 flex-col justify-between rounded-2xl border p-4 transition-colors"
            >
              <span className="text-primary text-2xl">＋</span>
              <span className="font-medium">Adicionar movimentação</span>
            </Link>
            <Link
              href="/app/projection"
              className="border-border bg-surface text-text hover:bg-surface-elevated flex min-h-32 flex-col justify-between rounded-2xl border p-4 transition-colors"
            >
              <span className="text-primary text-2xl">↗</span>
              <span className="font-medium">Ver previsão completa</span>
            </Link>
            <Link
              href="/app/movements"
              className="border-border bg-surface text-text hover:bg-surface-elevated col-span-2 flex items-center justify-between rounded-2xl border p-4 transition-colors"
            >
              <span className="font-medium">Todas as movimentações</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/app/balance"
              className="border-border bg-surface text-text hover:bg-surface-elevated col-span-2 flex items-center justify-between rounded-2xl border p-4 transition-colors"
            >
              <span className="font-medium">Atualizar saldo real</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="border-border bg-surface rounded-3xl border p-5 sm:p-6">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="text-text-muted text-sm">Próximos 7 dias</p>
                <h2 className="mt-1 text-xl font-semibold">Como o saldo pode evoluir</h2>
              </div>
              <Link href="/app/projection" className="text-primary text-sm font-medium">
                Detalhes
              </Link>
            </div>
            <ForecastChart data={chartData} />
            <p className="text-text-muted text-xs">
              Toque ou passe o mouse sobre a linha para consultar cada dia.
            </p>
          </article>
          <article className="border-border bg-surface rounded-3xl border p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Movimentações recentes</h2>
              <Link href="/app/movements" className="text-primary text-sm font-medium">
                Ver todas
              </Link>
            </div>
            {data.recentMovements.length === 0 ? (
              <EmptyState>Nenhuma movimentação ainda.</EmptyState>
            ) : (
              <div className="divide-border divide-y">
                {data.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{movement.description}</p>
                      <p className="text-text-muted text-xs">
                        {formatDate(movement.plannedDate)} ·{' '}
                        {movement.direction === 'income' ? 'Entrada' : 'Saída'}
                      </p>
                    </div>
                    <span
                      className={
                        movement.direction === 'income'
                          ? 'text-positive text-sm font-semibold'
                          : 'text-danger text-sm font-semibold'
                      }
                    >
                      {movement.direction === 'income' ? '+' : '-'}{' '}
                      {formatMoney(movement.expectedAmountCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
