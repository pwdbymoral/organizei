import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { auth } from '../../../lib/auth';
import { getDashboardData } from '../../../lib/dashboard-data';
import { ForecastChart } from '../../../components/forecast-chart';
import { ThemeToggle } from '../../../components/theme-toggle';
import { LogoutButton } from '../../../components/logout-button';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppNavigation } from '../../../components/app-navigation';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtMoney = (cents: number) => money.format(cents / 100);
const fmtDate = (value: string) => date.format(new Date(`${value}T12:00:00Z`));

export default async function ProjectionPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const membership = await dbMembership(session.user.id);
  if (!membership) redirect('/app');
  const data = await getDashboardData(membership.spaceId, session.user.id);
  const requested = Number((await searchParams)?.days);
  const days = [7, 14, 30].includes(requested) ? requested : 14;
  const chartData = data.projection.daily.slice(0, days).map((point) => ({
    date: point.date,
    label: fmtDate(point.date).slice(0, 5),
    balanceCents: point.balanceCents,
  }));
  return (
    <main className="bg-background text-text min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <div>
            <Link href="/app" className="text-primary text-sm">
              ← Visão geral
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Previsão do saldo</h1>
            <p className="text-text-muted mt-1">
              Veja o impacto das próximas movimentações antes que elas aconteçam.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <AppNavigation />
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-text-muted text-sm">Saldo nos próximos dias</p>
              <p className="mt-1 text-3xl font-semibold">
                {fmtMoney(chartData[chartData.length - 1]?.balanceCents ?? 0)}
              </p>
            </div>
            <nav
              aria-label="Horizonte da previsão"
              className="border-border bg-background inline-flex rounded-xl border p-1"
            >
              {[7, 14, 30].map((value) => (
                <Link
                  key={value}
                  href={`/app/projection?days=${value}`}
                  aria-current={days === value ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm ${days === value ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
                >
                  {value} dias
                </Link>
              ))}
            </nav>
          </div>
          <ForecastChart data={chartData} />
          <p className="text-text-muted mt-3 text-sm">
            A linha mostra o saldo previsto dia a dia. A linha vermelha indica o ponto em que o
            saldo fica negativo.
          </p>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-text-muted text-sm">Menor saldo</p>
            <p className="mt-2 text-xl font-semibold">
              {fmtMoney(data.projection.lowestBalanceCents)}
            </p>
          </article>
          <article className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-text-muted text-sm">Primeiro dia negativo</p>
            <p className="mt-2 text-xl font-semibold">
              {data.projection.firstNegativeDate
                ? fmtDate(data.projection.firstNegativeDate)
                : 'Não previsto'}
            </p>
          </article>
          <article className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-text-muted text-sm">Saldo confirmado</p>
            <p className="mt-2 text-xl font-semibold">{fmtMoney(data.activeBalance.amountCents)}</p>
          </article>
        </section>
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-8">
          <h2 className="text-xl font-semibold">Visão mensal</h2>
          <p className="text-text-muted mt-1 text-sm">
            Uma referência ampla para compromissos recorrentes e parcelas.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.monthlyProjection.map((item) => (
              <div
                key={item.month}
                className="border-border flex items-center justify-between rounded-xl border p-3"
              >
                <span className="text-sm capitalize">
                  {month.format(new Date(`${item.month}-01T12:00:00Z`))}
                </span>
                <span
                  className={item.balanceCents < 0 ? 'text-danger font-semibold' : 'font-semibold'}
                >
                  {fmtMoney(item.balanceCents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

async function dbMembership(userId: string) {
  const { db } = await import('@organizei/database');
  return db.query.familyMembership.findFirst({ where: eq(familyMembership.userId, userId) });
}
