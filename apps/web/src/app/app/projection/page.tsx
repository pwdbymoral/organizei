import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { auth } from '../../../lib/auth';
import { getDashboardData } from '../../../lib/dashboard-data';
import { ForecastChart } from '../../../components/forecast-chart';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppNavigation } from '../../../components/app-navigation';
import { AppPageHeader } from '../../../components/app-page-header';
import { ProjectionScenario } from '../../../components/projection-scenario';
import { ProjectionRangeSelector } from '../../../components/projection-range-selector';
import { MonthlyProjectionSection } from '../../../components/monthly-projection-section';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
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
  if (!data.lastBalance) redirect('/onboarding');
  const requested = Number((await searchParams)?.days);
  const days = [7, 14, 30].includes(requested) ? requested : 14;
  const chartData = data.projection.daily.slice(0, days).map((point) => ({
    date: point.date,
    label: fmtDate(point.date).slice(0, 5),
    balanceCents: point.balanceCents,
  }));
  return (
    <main className="bg-background text-text min-h-screen pb-28 sm:pb-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-8 sm:py-8">
        <AppPageHeader
          title="Previsão"
          description="Veja como as próximas movimentações podem mudar o caixa."
          context="Previsão do caixa"
        />
        <AppNavigation />
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-text-muted text-sm">Saldo estimado em {days} dias</p>
              <p className="mt-1 text-3xl font-semibold">
                {fmtMoney(chartData[chartData.length - 1]?.balanceCents ?? 0)}
              </p>
            </div>
            <ProjectionRangeSelector days={days} />
          </div>
          <ForecastChart data={chartData} />
          <p className="text-text-muted mt-3 text-sm">
            A linha mostra o saldo previsto dia a dia. A linha zero ajuda a identificar quando os
            compromissos ultrapassam o caixa.
          </p>
        </section>
        <ProjectionScenario data={chartData} />
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-text-muted text-sm">Menor saldo nos próximos {days} dias</p>
            <p className="mt-2 text-xl font-semibold">{fmtMoney(lowestBalance(chartData))}</p>
            <p className="text-text-muted mt-1 text-xs">
              {lowestDate(chartData) ? fmtDate(lowestDate(chartData)!) : 'Sem dados'}
            </p>
          </article>
          <article className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-text-muted text-sm">Primeiro dia negativo</p>
            <p className="mt-2 text-xl font-semibold">
              {chartData.find((point) => point.balanceCents < 0)
                ? fmtDate(chartData.find((point) => point.balanceCents < 0)!.date)
                : 'Não previsto'}
            </p>
          </article>
          <article className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-text-muted text-sm">Saldo atual</p>
            <p className="mt-2 text-xl font-semibold">
              {fmtMoney(data.cashSummary.currentBalanceCents)}
            </p>
            <p className="text-text-muted mt-1 text-xs">Base usada para esta previsão.</p>
          </article>
        </section>
        <MonthlyProjectionSection data={data.monthlyProjection} />
      </div>
    </main>
  );
}

function lowestBalance(data: { balanceCents: number }[]) {
  return data.reduce(
    (lowest, point) => Math.min(lowest, point.balanceCents),
    data[0]?.balanceCents ?? 0,
  );
}

function lowestDate(data: { date: string; balanceCents: number }[]) {
  return data.reduce<{ date: string; balanceCents: number } | null>(
    (lowest, point) => (!lowest || point.balanceCents < lowest.balanceCents ? point : lowest),
    null,
  )?.date;
}

async function dbMembership(userId: string) {
  const { db } = await import('@organizei/database');
  return db.query.familyMembership.findFirst({ where: eq(familyMembership.userId, userId) });
}
