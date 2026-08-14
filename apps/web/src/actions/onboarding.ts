'use server';

import { db, familyMembership, userPreferences } from '@organizei/database';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createOpeningBalanceCore } from '../lib/financial-core';
import { requireAuth, type FinancialFormState } from './financial';

function parseAmount(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Informe um saldo válido.');
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Informe um saldo válido.');
  return cents;
}

export async function completeOnboarding(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const user = await requireAuth();
    const membership = await db.query.familyMembership.findFirst({
      where: eq(familyMembership.userId, user.id),
    });
    if (!membership) throw new Error('Espaço familiar não encontrado.');

    await createOpeningBalanceCore(
      membership.spaceId,
      parseAmount(formData.get('amount')),
      user.id,
    );
    const registrationReminder = formData.get('registrationReminder') === 'on';
    const reminderTime = String(formData.get('registrationReminderTime') ?? '20:00');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      throw new Error('Horário do lembrete inválido.');
    }
    await db
      .insert(userPreferences)
      .values({
        userId: user.id,
        registrationReminder,
        registrationReminderTime: reminderTime,
        timezone: 'America/Maceio',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          registrationReminder,
          registrationReminderTime: reminderTime,
          updatedAt: new Date(),
        },
      });
    revalidatePath('/app');
    return { status: 'success', message: 'Tudo pronto. Seu espaço financeiro foi configurado.' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Não foi possível concluir a configuração.',
    };
  }
}
