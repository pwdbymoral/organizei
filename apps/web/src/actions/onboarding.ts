'use server';

import { db, familyMembership, userPreferences } from '@organizei/database';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { confirmBalanceCore } from '../lib/financial-core';
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

    const balanceMode = String(formData.get('balanceMode'));
    if (balanceMode !== 'reconstruct_history' && balanceMode !== 'confirmed_checkpoint') {
      throw new Error('Escolha como o saldo inicial deve ser calculado.');
    }
    await confirmBalanceCore(
      membership.spaceId,
      parseAmount(formData.get('amount')),
      user.id,
      balanceMode,
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

export async function completeBalanceRecalibration(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const user = await requireAuth();
    const membership = await db.query.familyMembership.findFirst({
      where: eq(familyMembership.userId, user.id),
    });
    if (!membership) throw new Error('Espaço familiar não encontrado.');
    const current = await db.query.confirmedBalance.findFirst({
      where: (table, { eq }) => eq(table.spaceId, membership.spaceId),
      orderBy: (table, { desc }) => desc(table.confirmedAt),
    });
    if (!current) throw new Error('Nenhum saldo inicial encontrado.');
    const balanceMode = String(formData.get('balanceMode'));
    if (balanceMode !== 'reconstruct_history' && balanceMode !== 'confirmed_checkpoint') {
      throw new Error('Escolha como o saldo deve ser calculado.');
    }
    await confirmBalanceCore(membership.spaceId, current.amountCents, user.id, balanceMode);
    revalidatePath('/app');
    return { status: 'success', message: 'Forma de cálculo atualizada.' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Não foi possível atualizar o saldo.',
    };
  }
}
