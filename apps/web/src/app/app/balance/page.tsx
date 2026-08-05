import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { auth } from '../../../lib/auth';
import { confirmBalance } from '../../../actions/financial';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppNavigation } from '../../../components/app-navigation';

export default async function BalancePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const { db } = await import('@organizei/database');
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');
  async function save(formData: FormData) {
    'use server';
    const amount = Number(String(formData.get('amount')).replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) return;
    await confirmBalance(membership!.spaceId, Math.round(amount * 100));
    redirect('/app');
  }
  return (
    <main className="bg-background text-text min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AppNavigation />
        <div className="max-w-xl">
          <Link href="/app" className="text-primary text-sm">
            ← Visão geral
          </Link>
          <section className="border-border bg-surface mt-5 rounded-3xl border p-6 sm:p-8">
            <p className="text-text-muted text-sm">Ponto de partida</p>
            <h1 className="mt-1 text-3xl font-semibold">Atualizar saldo real</h1>
            <p className="text-text-muted mt-2">
              Informe quanto existe hoje na conta. Isso recalibra a previsão sem alterar suas
              movimentações.
            </p>
            <form action={save} className="mt-8 grid gap-4">
              <label className="text-sm font-medium">
                Saldo disponível
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
                Salvar saldo
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
