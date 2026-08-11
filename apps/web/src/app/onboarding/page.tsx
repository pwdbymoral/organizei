import { eq } from 'drizzle-orm';
import { db, familyMembership, confirmedBalance } from '@organizei/database';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth';
import { OnboardingForm } from '../../components/onboarding-form';
import { ThemeToggle } from '../../components/theme-toggle';

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');
  const balance = await db.query.confirmedBalance.findFirst({
    where: eq(confirmedBalance.spaceId, membership.spaceId),
  });
  if (balance) redirect('/app');

  return (
    <main className="bg-background text-text flex min-h-screen items-center px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-primary text-sm font-semibold">Organizei</p>
            <p className="text-text-muted mt-1 text-xs">Seu espaço financeiro familiar</p>
          </div>
          <ThemeToggle />
        </div>
        <section className="border-border bg-surface rounded-3xl border p-6 shadow-sm sm:p-8">
          <p className="text-text-muted text-sm">Primeiro passo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vamos começar pelo saldo</h1>
          <p className="text-text-muted mt-3 text-sm leading-6">
            Informe quanto existe hoje no caixa. Depois, registre suas transações e o saldo será
            atualizado automaticamente.
          </p>
          <div className="mt-8">
            <OnboardingForm />
          </div>
        </section>
      </div>
    </main>
  );
}
