'use server';

import { auth } from '../lib/auth';
import { headers } from 'next/headers';
import {
  type MovementInput,
  type MovementUpdate,
  type RecurrenceInput,
  confirmBalanceCore,
  createMovementCore,
  createRecurrenceCore,
  materializeRecurrenceCore,
  recordPaymentCore,
  splitRecurrenceFromHereCore,
  updateMovementCore,
} from '../lib/financial-core';

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error('Unauthorized');
  return session.user;
}

export async function confirmBalance(spaceId: string, amountCents: number) {
  const user = await requireAuth();
  return confirmBalanceCore(spaceId, amountCents, user.id);
}

export async function createMovement(spaceId: string, data: MovementInput) {
  const user = await requireAuth();
  return createMovementCore(spaceId, data, user.id);
}

export async function updateMovement(
  spaceId: string,
  movementId: string,
  data: MovementUpdate,
  version: number,
) {
  const user = await requireAuth();
  return updateMovementCore(spaceId, movementId, data, version, user.id);
}

export async function createRecurrence(spaceId: string, data: RecurrenceInput) {
  const user = await requireAuth();
  return createRecurrenceCore(spaceId, data, user.id);
}

export async function materializeRecurrence(spaceId: string, ruleId: string, horizonEnd: string) {
  const user = await requireAuth();
  return materializeRecurrenceCore(spaceId, ruleId, horizonEnd, user.id);
}

export async function recordPayment(
  spaceId: string,
  movementId: string,
  amountCents: number,
  paidDate: string,
  version: number,
) {
  const user = await requireAuth();
  return recordPaymentCore(spaceId, movementId, amountCents, paidDate, version, user.id);
}

export async function splitRecurrenceFromHere(
  spaceId: string,
  ruleId: string,
  effectiveFrom: string,
  changes: Parameters<typeof splitRecurrenceFromHereCore>[3],
) {
  const user = await requireAuth();
  return splitRecurrenceFromHereCore(spaceId, ruleId, effectiveFrom, changes, user.id);
}
