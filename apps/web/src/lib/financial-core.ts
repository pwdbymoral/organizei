import {
  confirmedBalance,
  db,
  familyMembership,
  financialAuditLog,
  financialMovement,
} from '@organizei/database';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

const MAX_CENTS = 2_147_483_647;
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type MovementInput = {
  description: string;
  direction: 'income' | 'expense';
  expectedAmountCents: number;
  plannedDate: string;
};

export type MovementUpdate = Partial<MovementInput> & {
  status?: 'pending' | 'realized' | 'canceled';
  realizedAmountCents?: number | null;
  realizedDate?: string | null;
};

function assertCivilDate(value: string, field: string) {
  if (!CIVIL_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${field} inválida.`);
  }
}

function assertPositiveCents(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_CENTS) {
    throw new Error(`${field} deve ser um valor positivo em centavos.`);
  }
}

function validateMovementInput(data: MovementInput) {
  const description = data.description.trim();
  if (!description || description.length > 160) {
    throw new Error('Descrição deve ter entre 1 e 160 caracteres.');
  }
  if (data.direction !== 'income' && data.direction !== 'expense') {
    throw new Error('Direção inválida.');
  }
  assertPositiveCents(data.expectedAmountCents, 'Valor previsto');
  assertCivilDate(data.plannedDate, 'Data planejada');
  return { ...data, description };
}

export async function verifyMembership(spaceId: string, userId: string) {
  const membership = await db.query.familyMembership.findFirst({
    where: and(eq(familyMembership.spaceId, spaceId), eq(familyMembership.userId, userId)),
  });
  if (!membership) throw new Error('Forbidden');
  return membership;
}

export async function confirmBalanceCore(spaceId: string, amountCents: number, userId: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > MAX_CENTS) {
    throw new Error('Saldo deve ser um valor válido em centavos.');
  }
  await verifyMembership(spaceId, userId);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(confirmedBalance)
      .values({
        id: randomUUID(),
        spaceId,
        amountCents,
        authorId: userId,
        confirmedAt: new Date(),
      })
      .returning();

    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      authorId: userId,
      action: 'confirmed_balance.create',
      changes: JSON.stringify({ amountCents, confirmedAt: created!.confirmedAt.toISOString() }),
    });
    return created!;
  });
}

export async function createMovementCore(spaceId: string, data: MovementInput, userId: string) {
  const input = validateMovementInput(data);
  await verifyMembership(spaceId, userId);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(financialMovement)
      .values({
        id: randomUUID(),
        spaceId,
        ...input,
        status: 'pending',
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning();

    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      movementId: created!.id,
      authorId: userId,
      action: 'financial_movement.create',
      changes: JSON.stringify({
        direction: input.direction,
        expectedAmountCents: input.expectedAmountCents,
        plannedDate: input.plannedDate,
      }),
    });
    return created!;
  });
}

export async function updateMovementCore(
  spaceId: string,
  movementId: string,
  data: MovementUpdate,
  version: number,
  userId: string,
) {
  if (!Number.isSafeInteger(version) || version < 1) throw new Error('Versão inválida.');
  await verifyMembership(spaceId, userId);

  const existing = await db.query.financialMovement.findFirst({
    where: and(eq(financialMovement.id, movementId), eq(financialMovement.spaceId, spaceId)),
  });
  if (!existing) throw new Error('Not found');
  if (existing.version !== version) throw new Error('Conflict');
  if (existing.status !== 'pending') throw new Error('Movimentação já finalizada.');

  const input: MovementUpdate = { ...data };
  if (input.description !== undefined) {
    const description = input.description.trim();
    if (!description || description.length > 160) throw new Error('Descrição inválida.');
    input.description = description;
  }
  if (
    input.direction !== undefined &&
    input.direction !== 'income' &&
    input.direction !== 'expense'
  ) {
    throw new Error('Direção inválida.');
  }
  if (input.expectedAmountCents !== undefined) {
    assertPositiveCents(input.expectedAmountCents, 'Valor previsto');
  }
  if (input.plannedDate !== undefined) assertCivilDate(input.plannedDate, 'Data planejada');

  if (input.status === 'realized') {
    assertPositiveCents(
      input.realizedAmountCents ?? existing.expectedAmountCents,
      'Valor realizado',
    );
    assertCivilDate(input.realizedDate ?? existing.plannedDate, 'Data realizada');
    input.realizedAmountCents ??= existing.expectedAmountCents;
    input.realizedDate ??= existing.plannedDate;
  } else if (input.status === 'canceled') {
    input.realizedAmountCents = null;
    input.realizedDate = null;
  } else if (input.status !== undefined && input.status !== 'pending') {
    throw new Error('Estado inválido.');
  } else if (input.realizedAmountCents !== undefined || input.realizedDate !== undefined) {
    throw new Error('Valores realizados exigem uma movimentação realizada.');
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(financialMovement)
      .set({ ...input, updatedBy: userId, version: existing.version + 1, updatedAt: new Date() })
      .where(
        and(
          eq(financialMovement.id, movementId),
          eq(financialMovement.spaceId, spaceId),
          eq(financialMovement.version, version),
        ),
      )
      .returning();
    if (!updated) throw new Error('Conflict');

    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      movementId,
      authorId: userId,
      action: 'financial_movement.update',
      changes: JSON.stringify({ ...input, version: updated.version }),
    });
    return updated;
  });
}
