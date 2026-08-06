import { randomUUID } from 'node:crypto';
import { db, pushSubscription } from '@organizei/database';
import { and, eq } from 'drizzle-orm';

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  timezone?: string;
  userAgent?: string;
};

export async function savePushSubscription(userId: string, input: PushSubscriptionInput) {
  if (!input.endpoint.startsWith('https://') || input.endpoint.length > 2048) {
    throw new Error('Assinatura inválida.');
  }
  if (!input.keys?.p256dh || !input.keys?.auth) throw new Error('Assinatura inválida.');
  const values = {
    userId,
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    timezone: input.timezone || 'America/Maceio',
    userAgent: input.userAgent?.slice(0, 512) || null,
    updatedAt: new Date(),
    lastUsedAt: new Date(),
  } as const;
  await db
    .insert(pushSubscription)
    .values({ id: randomUUID(), ...values })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: values,
    });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
}
