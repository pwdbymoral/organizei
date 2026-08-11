import { eq } from 'drizzle-orm';
import { db, familyMembership, confirmedBalance } from '@organizei/database';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth';
import { BalanceModeForm } from '../../components/balance-mode-form';

export default async function RecalibratePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');
  const balance = await db.query.confirmedBalance.findFirst({
    where: eq(confirmedBalance.spaceId, membership.spaceId),
  });
  if (!balance || balance.balanceMode) redirect('/app');

  return (
    <main className="bg-background text-text flex min-h-screen items-center px-4 py-8">
      <section className="border-border bg-surface mx-auto w-full max-w-md rounded-3xl border p-6 sm:p-8">
        <p className="text-primary text-sm font-semibold">Organizei</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Como calcular seu saldo?</h1>
        <p className="text-text-muted mt-3 text-sm leading-6">
          Escolha como o saldo inicial já cadastrado deve se relacionar com suas transações.
        </p>
        <div className="mt-8">
          <BalanceModeForm />
        </div>
      </section>
    </main>
  );
}
