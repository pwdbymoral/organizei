'use server';

import { auth } from '../lib/auth';
import { headers } from 'next/headers';
import {
  type MovementInput,
  type MovementUpdate,
  confirmBalanceCore,
  createMovementCore,
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
