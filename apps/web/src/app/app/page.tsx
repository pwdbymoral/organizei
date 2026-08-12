import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth';
import { getDashboardData } from '../../lib/dashboard-data';
import { AppNavigation } from '../../components/app-navigation';
import { AppPageHeader } from '../../components/app-page-header';
import { Badge } from '../../components/ui/badge';
import { Empty, EmptyDescription } from '../../components/ui/empty';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const fmtMoney = (cents: number) => money.format(cents / 100);
const fmtDate = (value: string) => date.format(new Date(`${value}T12:00:00Z`));

export default async function Dashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const membership = await dbMembership(session.user.id);
  if (!membership) {
    return (
      <main className="bg-background text-text flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-xl font-medium">Sem Espaço Familiar</h1>
        <p className="text-text-muted mt-2 text-sm">
          Você precisa ser adicionado a um espaço familiar.
        </p>
      </main>
    );
  }

  const data = await getDashboardData(membership.spaceId, session.user.id);
  if (!data.lastBalance) redirect('/onboarding');
  if (!data.lastBalance.balanceMode) redirect('/recalibrate');

  const upcoming = data.normalizedMovements
    .filter((movement) => movement.status === 'pending')
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
    .slice(0, 4);
  const recent = data.normalizedMovements
    .filter((movement) => movement.status === 'realized')
    .sort((a, b) =>
      (b.realizedDate ?? b.plannedDate).localeCompare(a.realizedDate ?? a.plannedDate),
    )
    .slice(0, 4);

  return (
    <main className="bg-background text-text min-h-screen pb-28 sm:pb-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8">
        <AppPageHeader
          title="Visão geral"
          description="O que você precisa saber para decidir com tranquilidade."
          context="Caixa familiar"
        />
        <AppNavigation />

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-sm sm:p-8">
            <p className="text-primary-foreground/85 text-sm">Saldo atual</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {fmtMoney(data.cashSummary.currentBalanceCents)}
            </p>
            {data.projection.firstNegativeDate && (
              <p className="bg-primary-foreground/10 mt-5 rounded-2xl p-3 text-sm">
                O saldo pode ficar negativo em {fmtDate(data.projection.firstNegativeDate)}.{' '}
                <Link className="font-semibold underline underline-offset-4" href="/app/projection">
                  Ver impacto
                </Link>
              </p>
            )}
          </article>

          <article className="border-border bg-surface rounded-3xl border p-6 sm:p-8">
            <p className="text-text-muted text-sm">Caixa livre</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {fmtMoney(data.cashSummary.freeCashCents)}
            </p>
            <p className="text-text-muted mt-2 text-sm">
              Disponível depois dos compromissos até {fmtDate(data.cashSummary.freeCashThrough)}.
            </p>
            <Link
              href="/app/projection"
              className="text-primary mt-5 inline-flex text-sm font-semibold"
            >
              Entender a previsão{' '}
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </Link>
          </article>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/add"
            className="bg-primary/10 border-primary/20 text-text hover:bg-primary/15 flex min-h-24 items-center justify-between rounded-2xl border p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            <span>
              <span className="block text-lg font-semibold">Nova transação</span>
              <span className="text-text-muted mt-1 block text-sm">
                Registre o que aconteceu ou o que está previsto.
              </span>
            </span>
            <span aria-hidden="true" className="text-primary text-3xl">
              ＋
            </span>
          </Link>
          <Link
            href="/app/movements"
            className="border-border bg-surface hover:bg-surface-elevated flex min-h-24 items-center justify-between rounded-2xl border p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            <span>
              <span className="block text-lg font-semibold">Ver transações</span>
              <span className="text-text-muted mt-1 block text-sm">
                Revise o que já aconteceu e o que vem pela frente.
              </span>
            </span>
            <span aria-hidden="true" className="text-primary text-2xl">
              →
            </span>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="border-border bg-surface rounded-3xl border p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-text-muted text-sm">O que vem pela frente</p>
                <h2 className="mt-1 text-xl font-semibold">Próximas movimentações</h2>
              </div>
              <Link href="/app/movements" className="text-primary text-sm font-semibold">
                Ver todas
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <Empty className="border-border bg-surface rounded border border-dashed py-8">
                <EmptyDescription>Nenhuma transação pendente.</EmptyDescription>
              </Empty>
            ) : (
              <div className="divide-border divide-y">
                {upcoming.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{movement.description}</p>
                      <p className="text-text-muted mt-1 text-xs">
                        {movement.plannedDate < data.today
                          ? 'Vencida'
                          : fmtDate(movement.plannedDate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={
                          movement.direction === 'income'
                            ? 'text-positive font-semibold'
                            : 'text-danger font-semibold'
                        }
                      >
                        {movement.direction === 'income' ? '+' : '-'}{' '}
                        {fmtMoney(movement.expectedAmountCents)}
                      </p>
                      <Badge variant="outline" className="text-warning">
                        Pendente
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="border-border bg-surface rounded-3xl border p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-text-muted text-sm">Histórico recente</p>
                <h2 className="mt-1 text-xl font-semibold">Últimas realizadas</h2>
              </div>
              <Link
                href="/app/movements?status=realized"
                className="text-primary text-sm font-semibold"
              >
                Ver histórico
              </Link>
            </div>
            {recent.length === 0 ? (
              <Empty className="border-border bg-surface rounded border border-dashed py-8">
                <EmptyDescription>Nenhuma transação realizada ainda.</EmptyDescription>
              </Empty>
            ) : (
              <div className="divide-border divide-y">
                {recent.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{movement.description}</p>
                      <p className="text-text-muted mt-1 text-xs">
                        {fmtDate(movement.realizedDate ?? movement.plannedDate)}
                      </p>
                    </div>
                    <p
                      className={
                        movement.direction === 'income'
                          ? 'text-positive font-semibold'
                          : 'text-danger font-semibold'
                      }
                    >
                      {movement.direction === 'income' ? '+' : '-'}{' '}
                      {fmtMoney(movement.realizedAmountCents ?? movement.expectedAmountCents)}
                    </p>
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

async function dbMembership(userId: string) {
  const { db } = await import('@organizei/database');
  return db.query.familyMembership.findFirst({ where: eq(familyMembership.userId, userId) });
}
