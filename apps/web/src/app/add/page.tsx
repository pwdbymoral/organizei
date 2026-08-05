import { db, familyMembership } from '@organizei/database';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AddMovementForm } from '../../components/add-movement-form';
import { auth } from '../../lib/auth';

export default async function AddMovementPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');

  return (
    <main className="bg-background text-text mx-auto min-h-screen max-w-xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium">Adição rápida</h1>
      </header>
      <AddMovementForm spaceId={membership.spaceId} />
    </main>
  );
}
