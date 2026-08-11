import { db, familyMembership } from '@organizei/database';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AddMovementForm } from '../../components/add-movement-form';
import { auth } from '../../lib/auth';
import { AppNavigation } from '../../components/app-navigation';
import { AppPageHeader } from '../../components/app-page-header';

export default async function AddMovementPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');

  return (
    <main className="bg-background text-text min-h-screen pb-28 sm:pb-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8">
        <AppPageHeader
          title="Nova transação"
          description="Registre uma entrada ou saída em poucos passos."
          context="Novo registro"
        />
        <AppNavigation />
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-8">
          <AddMovementForm spaceId={membership.spaceId} />
        </section>
      </div>
    </main>
  );
}
