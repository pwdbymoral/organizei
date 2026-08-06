import { randomUUID } from 'node:crypto';
import webpush from 'web-push';
import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import {
  db,
  familyMembership,
  financialMovement,
  notificationDelivery,
  pool,
  pushSubscription,
  userPreferences,
} from '../packages/database/src';
import { getDashboardData } from '../apps/web/src/lib/dashboard-data';

type NotificationKind = 'registration' | 'summary' | 'due' | 'balance';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.test';
if (!vapidPublicKey || !vapidPrivateKey) {
  throw new Error(
    'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be configured for the notifications worker.',
  );
}
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

function localNow(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

async function enqueue(userId: string, kind: NotificationKind, date: string, scheduledFor: Date) {
  await db
    .insert(notificationDelivery)
    .values({
      id: randomUUID(),
      userId,
      kind,
      dedupeKey: `${kind}:${userId}:${date}`,
      scheduledFor,
    })
    .onConflictDoNothing({ target: notificationDelivery.dedupeKey });
}

async function enqueueDueNotifications() {
  const preferences = await db
    .select({ preference: userPreferences, subscription: pushSubscription })
    .from(userPreferences)
    .innerJoin(pushSubscription, eq(pushSubscription.userId, userPreferences.userId));
  const memberships = await db.select().from(familyMembership);
  const membershipByUser = new Map(
    memberships.map((membership) => [membership.userId, membership]),
  );

  for (const { preference } of preferences) {
    const now = localNow(preference.timezone);
    if (preference.registrationReminder && now.time >= preference.registrationReminderTime) {
      await enqueue(preference.userId, 'registration', now.date, new Date());
    }
    if (preference.dailySummary && now.time >= '08:00') {
      await enqueue(preference.userId, 'summary', now.date, new Date());
    }
    const membership = membershipByUser.get(preference.userId);
    if (!membership) continue;
    if (preference.dueReminders) {
      const upcoming = await db.query.financialMovement.findFirst({
        where: and(
          eq(financialMovement.spaceId, membership.spaceId),
          eq(financialMovement.status, 'pending'),
          gte(financialMovement.plannedDate, now.date),
          lte(financialMovement.plannedDate, sql`(${now.date}::date + interval '2 days')`),
        ),
      });
      if (upcoming && now.time >= '08:00')
        await enqueue(preference.userId, 'due', now.date, new Date());
    }
    if (preference.balanceAlerts && now.time >= '08:00') {
      const dashboard = await getDashboardData(membership.spaceId, preference.userId, now.date);
      if (dashboard.lastBalance && dashboard.projection.firstNegativeDate) {
        await enqueue(preference.userId, 'balance', now.date, new Date());
      }
    }
  }
}

function message(kind: NotificationKind) {
  switch (kind) {
    case 'registration':
      return 'Lembrete: registre as movimentações de hoje.';
    case 'summary':
      return 'Seu resumo diário está pronto no Organizei.';
    case 'due':
      return 'Há movimentações próximas para revisar.';
    case 'balance':
      return 'A previsão do caixa merece sua atenção.';
  }
}

async function processDeliveries() {
  const now = new Date();
  const deliveries = await db.query.notificationDelivery.findMany({
    where: and(
      eq(notificationDelivery.status, 'pending'),
      lte(notificationDelivery.scheduledFor, now),
      or(
        sql`${notificationDelivery.lockedUntil} is null`,
        lte(notificationDelivery.lockedUntil, now),
      ),
    ),
    limit: 25,
  });
  for (const delivery of deliveries) {
    const locked = await db
      .update(notificationDelivery)
      .set({
        status: 'processing',
        lockedUntil: new Date(Date.now() + 5 * 60_000),
        attempts: delivery.attempts + 1,
        updatedAt: now,
      })
      .where(
        and(eq(notificationDelivery.id, delivery.id), eq(notificationDelivery.status, 'pending')),
      )
      .returning();
    if (!locked.length) continue;
    const subscriptions = await db.query.pushSubscription.findMany({
      where: eq(pushSubscription.userId, delivery.userId),
    });
    let delivered = false;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: 'Organizei',
            body: message(delivery.kind as NotificationKind),
            url: '/app',
          }),
        );
        delivered = true;
        await db
          .update(pushSubscription)
          .set({ lastUsedAt: now, updatedAt: now })
          .where(eq(pushSubscription.id, subscription.id));
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscription).where(eq(pushSubscription.id, subscription.id));
        }
      }
    }
    await db
      .update(notificationDelivery)
      .set({
        status: delivered ? 'sent' : 'failed',
        sentAt: delivered ? now : null,
        lockedUntil: null,
        lastError: delivered ? null : 'Nenhuma assinatura ativa conseguiu receber o alerta.',
        updatedAt: now,
      })
      .where(eq(notificationDelivery.id, delivery.id));
  }
}

async function tick() {
  await enqueueDueNotifications();
  await processDeliveries();
}

async function main() {
  await tick();
  setInterval(
    () => void tick().catch(() => console.error('notifications-worker tick failed')),
    60_000,
  );
  process.once('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
  });
  process.once('SIGINT', async () => {
    await pool.end();
    process.exit(0);
  });
}

void main().catch(() => {
  console.error('notifications-worker failed to start');
  process.exitCode = 1;
});
