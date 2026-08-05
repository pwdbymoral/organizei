import { db } from '@organizei/database';
import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { redirect } from 'next/navigation';
import { createMovement } from '../../actions/financial';
import { auth } from '../../lib/auth';
import { headers } from 'next/headers';

export default async function AddMovementPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect('/login');
  }
  const user = session.user;

  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, user.id),
  });

  if (!membership) {
    redirect('/app');
  }

  async function addAction(formData: FormData) {
    'use server';
    const description = formData.get('description') as string;
    const direction = formData.get('direction') as 'income' | 'expense';
    const amount = parseFloat(formData.get('amount') as string);
    const plannedDate = formData.get('plannedDate') as string;

    const expectedAmountCents = Math.round(amount * 100);

    await createMovement(membership!.spaceId, {
      description,
      direction,
      expectedAmountCents,
      plannedDate,
    });

    redirect('/');
  }

  return (
    <main className="bg-background text-text mx-auto min-h-screen max-w-md p-4">
      <header className="mb-6">
        <h1 className="text-xl font-medium">Adição rápida</h1>
      </header>

      <form action={addAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="description">
            Descrição
          </label>
          <input
            type="text"
            id="description"
            name="description"
            required
            className="border-border bg-surface w-full rounded-md border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="direction">
            Tipo
          </label>
          <select
            id="direction"
            name="direction"
            className="border-border bg-surface w-full rounded-md border p-2"
          >
            <option value="expense" className="text-black">
              Saída
            </option>
            <option value="income" className="text-black">
              Entrada
            </option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="amount">
            Valor
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.01"
            min="0.01"
            required
            className="border-border bg-surface w-full rounded-md border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="plannedDate">
            Data Planejada
          </label>
          <input
            type="date"
            id="plannedDate"
            name="plannedDate"
            required
            className="border-border bg-surface w-full rounded-md border p-2"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <a
            href="/app"
            className="border-border hover:bg-surface-elevated flex-1 rounded-md border py-2 text-center transition-colors"
          >
            Cancelar
          </a>
          <button
            type="submit"
            className="bg-primary flex-1 rounded-md py-2 font-medium text-white transition-opacity hover:opacity-90"
          >
            Salvar
          </button>
        </div>
      </form>
    </main>
  );
}
