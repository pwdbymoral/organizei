import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { auth } from '../../../lib/auth';
import { getDashboardData } from '../../../lib/dashboard-data';
import { parseTimelineFilters, matchesTimelineFilters } from '../../../lib/financial-filters';
import { StatusBadge, EmptyState } from '@organizei/ui';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { recordPayment, updateMovement } from '../../../actions/financial';
import { revalidatePath } from 'next/cache';
import { FinancialMovementDialogs } from '../../../components/financial-movement-dialogs';
import { FinancialPaymentForm } from '../../../components/financial-payment-form';
import { AppNavigation } from '../../../components/app-navigation';
import { AppPageHeader } from '../../../components/app-page-header';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const fmtMoney = (cents: number) => money.format(cents / 100);
const fmtDate = (value: string) => date.format(new Date(`${value}T12:00:00Z`));

export default async function MovementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const membership = await dbMembership(session.user.id);
  if (!membership) redirect('/app');
  const spaceId = membership.spaceId;
  const data = await getDashboardData(spaceId, session.user.id);
  const filters = parseTimelineFilters((await searchParams) ?? {});
  const movements = data.normalizedMovements.filter((movement) =>
    matchesTimelineFilters(movement, filters, data.today),
  );
  async function realize(formData: FormData) {
    'use server';
    const movement = data.normalizedMovements.find(
      (item) => item.id === String(formData.get('movementId')),
    );
    if (!movement) return;
    const paid = data.payments
      .filter((payment) => payment.movementId === movement.id)
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const remaining = movement.expectedAmountCents - paid;
    if (remaining > 0)
      await recordPayment(
        spaceId,
        movement.id,
        remaining,
        data.today,
        Number(formData.get('version')),
      );
    revalidatePath('/app/movements');
  }
  async function cancel(formData: FormData) {
    'use server';
    await updateMovement(
      spaceId,
      String(formData.get('movementId')),
      { status: 'canceled' },
      Number(formData.get('version')),
    );
    revalidatePath('/app/movements');
  }
  return (
    <main className="bg-background text-text min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-8 sm:py-8">
        <AppPageHeader
          title="Movimentações"
          description="Pesquise e revise tudo que influencia o caixa."
          context="Organização do caixa"
        />
        <AppNavigation />
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">{movements.length} resultado(s)</span>
          <Link
            href="/add"
            className="bg-primary rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            Adicionar
          </Link>
        </div>
        <form
          method="get"
          className="border-border bg-surface grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-sm font-medium sm:col-span-2">
            Buscar descrição ou valor
            <input
              name="q"
              defaultValue={filters.query}
              placeholder="Ex.: aluguel ou 1.250,00"
              className="border-border bg-background mt-1 min-h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-sm font-medium">
            Situação
            <select
              name="status"
              defaultValue={filters.status}
              className="border-border bg-background mt-1 min-h-11 w-full rounded-xl border px-3"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendente</option>
              <option value="realized">Realizado</option>
              <option value="canceled">Cancelado</option>
              <option value="overdue">Vencido</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Tipo
            <select
              name="direction"
              defaultValue={filters.direction}
              className="border-border bg-background mt-1 min-h-11 w-full rounded-xl border px-3"
            >
              <option value="all">Todos</option>
              <option value="income">Entradas</option>
              <option value="expense">Saídas</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            De
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              className="border-border bg-background mt-1 min-h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-sm font-medium">
            Até
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              className="border-border bg-background mt-1 min-h-11 w-full rounded-xl border px-3"
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button className="bg-primary min-h-11 rounded-xl px-4 text-sm font-semibold text-white">
              Aplicar filtros
            </button>
            <Link
              href="/app/movements"
              className="border-border min-h-11 rounded-xl border px-4 py-2 text-sm"
            >
              Limpar
            </Link>
          </div>
        </form>
        {movements.length === 0 ? (
          <EmptyState>Nenhuma movimentação encontrada.</EmptyState>
        ) : (
          <section className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
            {movements.map((movement) => {
              const overdue = movement.status === 'pending' && movement.plannedDate < data.today;
              return (
                <article
                  key={movement.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h2 className="font-medium">{movement.description}</h2>
                    <p className="text-text-muted mt-1 text-sm">
                      {fmtDate(movement.plannedDate)} ·{' '}
                      {movement.direction === 'income' ? 'Entrada' : 'Saída'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge
                      tone={
                        movement.status === 'realized'
                          ? 'positive'
                          : movement.status === 'canceled'
                            ? 'neutral'
                            : 'warning'
                      }
                    >
                      {movement.status === 'realized'
                        ? 'Realizado'
                        : movement.status === 'canceled'
                          ? 'Cancelado'
                          : overdue
                            ? 'Vencido'
                            : 'Pendente'}
                    </StatusBadge>
                    <span
                      className={
                        movement.direction === 'income'
                          ? 'text-positive font-semibold'
                          : 'text-danger font-semibold'
                      }
                    >
                      {movement.direction === 'income' ? '+' : '-'}{' '}
                      {fmtMoney(movement.expectedAmountCents)}
                    </span>
                    {movement.status === 'pending' && (
                      <>
                        <FinancialPaymentForm
                          spaceId={spaceId}
                          movementId={movement.id}
                          version={movement.version}
                          description={movement.description}
                          paidDate={data.today}
                          remainingCents={movement.expectedAmountCents}
                        />
                        <form action={realize}>
                          <input type="hidden" name="movementId" value={movement.id} />
                          <input type="hidden" name="version" value={movement.version} />
                          <button className="border-border min-h-11 rounded-xl border px-3 text-xs font-semibold">
                            Realizar
                          </button>
                        </form>
                        <FinancialMovementDialogs
                          spaceId={spaceId}
                          movement={{
                            id: movement.id,
                            recurrenceRuleVersionId: movement.recurrenceRuleVersionId,
                            cadence: movement.recurrenceRuleVersionId
                              ? (data.recurrenceById.get(movement.recurrenceRuleVersionId)
                                  ?.cadence ?? 'monthly')
                              : null,
                            version: movement.version,
                            description: movement.description,
                            direction: movement.direction,
                            expectedAmountCents: movement.expectedAmountCents,
                            plannedDate: movement.plannedDate,
                          }}
                        />
                        <form action={cancel}>
                          <input type="hidden" name="movementId" value={movement.id} />
                          <input type="hidden" name="version" value={movement.version} />
                          <button className="text-danger border-border min-h-11 rounded-xl border px-3 text-xs">
                            Cancelar
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

async function dbMembership(userId: string) {
  const { db } = await import('@organizei/database');
  return db.query.familyMembership.findFirst({ where: eq(familyMembership.userId, userId) });
}
