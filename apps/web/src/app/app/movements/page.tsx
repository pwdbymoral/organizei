import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { auth } from '../../../lib/auth';
import { getDashboardData } from '../../../lib/dashboard-data';
import {
  parseTimelineFilters,
  matchesTimelineFilters,
  resolveTimelinePeriod,
} from '../../../lib/financial-filters';
import { Badge } from '../../../components/ui/badge';
import { Empty, EmptyDescription } from '../../../components/ui/empty';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { recordPayment, undoRealization, updateMovement } from '../../../actions/financial';
import { revalidatePath } from 'next/cache';
import { FinancialMovementDialogs } from '../../../components/financial-movement-dialogs';
import { FinancialPaymentForm } from '../../../components/financial-payment-form';
import { AppNavigation } from '../../../components/app-navigation';
import { AppPageHeader } from '../../../components/app-page-header';
import { remainingAmountCents } from '@organizei/domain';
import { ConfirmSubmitButton } from '../../../components/confirm-submit-button';
import { MovementActionSurface } from '../../../components/movement-action-surface';
import { ResponsiveFilters } from '../../../components/responsive-filters';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

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
  if (!data.lastBalance) redirect('/onboarding');
  const params = (await searchParams) ?? {};
  const filters = parseTimelineFilters(params);
  const period = resolveTimelinePeriod(params, data.today);
  const movements = data.normalizedMovements.filter(
    (movement) =>
      matchesTimelineFilters(movement, filters, data.today) &&
      (!period.from || (movement.realizedDate ?? movement.plannedDate) >= period.from) &&
      (!period.to || (movement.realizedDate ?? movement.plannedDate) <= period.to),
  );
  const hasFilters = Boolean(
    filters.query ||
      filters.status !== 'all' ||
      filters.direction !== 'all' ||
      filters.from ||
      filters.to ||
      period.mode !== 'month' ||
      period.month !== data.today.slice(0, 7),
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
  async function undo(formData: FormData) {
    'use server';
    await undoRealization(
      spaceId,
      String(formData.get('movementId')),
      Number(formData.get('version')),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
  }
  const monthHref = (month: string) => `/app/movements?month=${month}`;
  return (
    <main className="bg-background text-text min-h-screen pb-28 sm:pb-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-8 sm:py-8">
        <AppPageHeader
          title="Transações"
          description="Registre o que aconteceu e acompanhe o que vem pela frente."
          context="Seu histórico financeiro"
        />
        <AppNavigation />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-text-muted text-sm">{movements.length} transações</span>
            <span className="bg-muted text-text-muted rounded-full px-3 py-1 text-xs">
              {period.label}
            </span>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/add">Nova transação</Link>
          </Button>
        </div>
        <nav aria-label="Período das transações" className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant={
              period.mode === 'month' && period.month === data.today.slice(0, 7)
                ? 'secondary'
                : 'outline'
            }
            size="sm"
          >
            <Link href={monthHref(data.today.slice(0, 7))}>Este mês</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={monthHref(addMonths(data.today.slice(0, 7), -1))}>Mês anterior</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={monthHref(addMonths(data.today.slice(0, 7), 1))}>Próximo mês</Link>
          </Button>
          <Button asChild variant={period.mode === 'all' ? 'secondary' : 'outline'} size="sm">
            <Link href="/app/movements?view=all">Todas</Link>
          </Button>
        </nav>
        <ResponsiveFilters active={hasFilters}>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {period.mode === 'month' && <input type="hidden" name="month" value={period.month} />}
            {period.mode === 'all' && <input type="hidden" name="view" value="all" />}
            <label className="text-sm font-medium sm:col-span-2">
              Buscar descrição ou valor
              <Input
                name="q"
                defaultValue={filters.query}
                placeholder="Ex.: aluguel ou 1.250,00"
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Situação
              <Select name="status" defaultValue={filters.status}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="realized">Realizada</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium">
              Tipo
              <Select name="direction" defaultValue={filters.direction}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Entradas</SelectItem>
                  <SelectItem value="expense">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium">
              De
              <Input type="date" name="from" defaultValue={filters.from} className="mt-1" />
            </label>
            <label className="text-sm font-medium">
              Até
              <Input type="date" name="to" defaultValue={filters.to} className="mt-1" />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit">Aplicar filtros</Button>
              <Link
                href="/app/movements"
                className="inline-flex min-h-10 items-center rounded-md border px-4 py-2 text-sm"
              >
                Limpar
              </Link>
            </div>
          </form>
        </ResponsiveFilters>
        {movements.length === 0 ? (
          <Empty className="border-border bg-surface rounded border border-dashed py-8">
            <EmptyDescription>Nenhuma transação encontrada.</EmptyDescription>
          </Empty>
        ) : (
          <section className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
            {movements.map((movement) => {
              const overdue = movement.status === 'pending' && movement.plannedDate < data.today;
              return (
                <article
                  key={movement.id}
                  className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <h2 className="truncate font-medium">{movement.description}</h2>
                    <p className="text-text-muted mt-1 text-sm">
                      {fmtDate(movement.realizedDate ?? movement.plannedDate)} ·{' '}
                      {movement.direction === 'income' ? 'Entrada' : 'Saída'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <Badge
                      variant={movement.status === 'canceled' ? 'outline' : 'secondary'}
                      className={
                        movement.status === 'realized'
                          ? 'text-positive'
                          : movement.status === 'pending'
                            ? 'text-warning'
                            : 'text-muted-foreground'
                      }
                    >
                      {movement.status === 'realized'
                        ? 'Realizado'
                        : movement.status === 'canceled'
                          ? 'Cancelado'
                          : overdue
                            ? 'Vencido'
                            : 'Pendente'}
                    </Badge>
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
                  </div>
                  {movement.status !== 'canceled' && (
                    <div className="flex justify-end sm:justify-self-end">
                      <MovementActionSurface
                        title={movement.description}
                        description={
                          (movement.direction === 'income' ? 'Entrada' : 'Saída') +
                          ' de ' +
                          fmtMoney(movement.expectedAmountCents)
                        }
                      >
                        {movement.status === 'pending' && (
                          <>
                            <FinancialPaymentForm
                              spaceId={spaceId}
                              movementId={movement.id}
                              version={movement.version}
                              description={movement.description}
                              paidDate={data.today}
                              remainingCents={remainingAmountCents(
                                movement.expectedAmountCents,
                                data.payments.filter(
                                  (payment) => payment.movementId === movement.id,
                                ),
                              )}
                            />
                            <form action={realize} className="grid gap-2">
                              <input type="hidden" name="movementId" value={movement.id} />
                              <input type="hidden" name="version" value={movement.version} />
                              <Button type="submit" className="w-full">
                                {movement.direction === 'income'
                                  ? 'Registrar entrada'
                                  : 'Registrar pagamento integral'}
                              </Button>
                            </form>
                          </>
                        )}
                        {movement.status === 'realized' && (
                          <form action={undo}>
                            <input type="hidden" name="movementId" value={movement.id} />
                            <input type="hidden" name="version" value={movement.version} />
                            <ConfirmSubmitButton
                              message="Desfazer a realização? A transação voltará a pendente e deixará de impactar o saldo atual."
                              className="text-destructive border-border min-h-10 w-full rounded-md border px-3 text-sm"
                            >
                              Desfazer realização
                            </ConfirmSubmitButton>
                          </form>
                        )}
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
                            realizedDate: movement.realizedDate,
                            status: movement.status,
                          }}
                        />
                        {movement.status === 'pending' && (
                          <form action={cancel}>
                            <input type="hidden" name="movementId" value={movement.id} />
                            <input type="hidden" name="version" value={movement.version} />
                            <ConfirmSubmitButton
                              message="Cancelar esta transação? Ela deixará de influenciar as previsões futuras."
                              className="text-destructive border-border min-h-10 w-full rounded-md border px-3 text-sm"
                            >
                              Cancelar
                            </ConfirmSubmitButton>
                          </form>
                        )}
                      </MovementActionSurface>
                    </div>
                  )}
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

function addMonths(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
