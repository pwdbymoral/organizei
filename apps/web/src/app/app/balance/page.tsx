import { eq, desc } from 'drizzle-orm';
import { confirmedBalance, familyMembership } from '@organizei/database';
import { auth } from '../../../lib/auth';
import { confirmBalance } from '../../../actions/financial';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppNavigation } from '../../../components/app-navigation';
import { AppPageHeader } from '../../../components/app-page-header';

export default async function BalancePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const { db } = await import('@organizei/database');
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');
  const latest = await db.query.confirmedBalance.findFirst({
    where: eq(confirmedBalance.spaceId, membership.spaceId),
    orderBy: desc(confirmedBalance.confirmedAt),
  });
  async function save(formData: FormData) {
    'use server';
    const amount = Number(String(formData.get('amount')).replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) return;
    await confirmBalance(membership!.spaceId, Math.round(amount * 100));
    redirect('/app');
  }
  return (
    <main className="bg-background text-text min-h-screen px-4 py-8 pb-28 sm:pb-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AppNavigation />
        <div className="max-w-xl">
          <AppPageHeader
            title="Saldo"
            description="Corrija a base do caixa quando o app e a realidade não coincidirem."
            context="Conferência excepcional"
          />
          <section className="border-border bg-surface mt-5 rounded-3xl border p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Corrigir saldo atual</h2>
            <p className="text-text-muted mt-2">
              Isso cria uma nova conferência e recalibra a previsão sem apagar suas movimentações.
            </p>
            {latest && (
              <p className="text-text-muted bg-background mt-3 rounded-xl p-3 text-sm">
                Último valor informado:{' '}
                <strong>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    latest.amountCents / 100,
                  )}
                </strong>
                .
              </p>
            )}
            <form action={save} className="mt-8 grid gap-4">
              <label className="text-sm font-medium">
                Novo saldo atual
                <input
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  required
                  className="border-border bg-background mt-1 min-h-12 w-full rounded-xl border px-3 text-lg"
                />
              </label>
              <button className="bg-primary min-h-12 rounded-xl px-4 font-semibold text-white">
                Corrigir saldo
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
