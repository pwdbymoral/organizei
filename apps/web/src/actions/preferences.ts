'use server';

import { db, userPreferences } from '@organizei/database';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './financial';

export type UserPreferences = {
  theme: 'system' | 'light' | 'dark';
  dailySummary: boolean;
  balanceAlerts: boolean;
  dueReminders: boolean;
};

const defaults: UserPreferences = {
  theme: 'system',
  dailySummary: true,
  balanceAlerts: true,
  dueReminders: true,
};

export async function getUserPreferences(): Promise<UserPreferences> {
  const user = await requireAuth();
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, user.id),
  });
  if (!row) return defaults;
  return {
    theme: row.theme === 'light' || row.theme === 'dark' ? row.theme : 'system',
    dailySummary: row.dailySummary,
    balanceAlerts: row.balanceAlerts,
    dueReminders: row.dueReminders,
  };
}

export async function saveUserPreferences(formData: FormData) {
  const user = await requireAuth();
  const theme = String(formData.get('theme') ?? 'system');
  if (!['system', 'light', 'dark'].includes(theme)) throw new Error('Tema inválido.');
  const values = {
    userId: user.id,
    theme,
    dailySummary: formData.get('dailySummary') === 'on',
    balanceAlerts: formData.get('balanceAlerts') === 'on',
    dueReminders: formData.get('dueReminders') === 'on',
    updatedAt: new Date(),
  } as const;
  await db
    .insert(userPreferences)
    .values(values)
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        theme: values.theme,
        dailySummary: values.dailySummary,
        balanceAlerts: values.balanceAlerts,
        dueReminders: values.dueReminders,
        updatedAt: values.updatedAt,
      },
    });
  revalidatePath('/app/more');
}
