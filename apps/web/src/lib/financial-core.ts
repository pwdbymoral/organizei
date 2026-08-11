import {
  confirmedBalance,
  db,
  familyMembership,
  financialAuditLog,
  financialMovement,
  financialPayment,
  recurrenceRuleVersion,
  recurrenceSeries,
} from '@organizei/database';
import { and, eq, gte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  calculateCurrentBalanceCents,
  generateRecurrenceDates,
  remainingAmountCents,
  toCivilDate,
  type RecurrenceCadence,
} from '@organizei/domain';

const MAX_CENTS = 2_147_483_647;
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type MovementInput = {
  description: string;
  direction: 'income' | 'expense';
  expectedAmountCents: number;
  plannedDate: string;
  initialStatus?: 'pending' | 'realized';
};

export type MovementUpdate = Partial<MovementInput> & {
  status?: 'pending' | 'realized' | 'canceled';
  realizedAmountCents?: number | null;
  realizedDate?: string | null;
};

export type RecurrenceInput = MovementInput & {
  cadence: RecurrenceCadence;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  maxOccurrences?: number | null;
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
  return {
    description,
    direction: data.direction,
    expectedAmountCents: data.expectedAmountCents,
    plannedDate: data.plannedDate,
  };
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

/** Records only the difference between the calculated balance and the user's real balance. */
export async function createBalanceAdjustmentCore(
  spaceId: string,
  targetAmountCents: number,
  today: string,
  userId: string,
) {
  if (
    !Number.isSafeInteger(targetAmountCents) ||
    targetAmountCents < 0 ||
    targetAmountCents > MAX_CENTS
  ) {
    throw new Error('Saldo deve ser um valor válido em centavos.');
  }
  assertCivilDate(today, 'Data do ajuste');
  await verifyMembership(spaceId, userId);

  return db.transaction(async (tx) => {
    const checkpoint = await tx.query.confirmedBalance.findFirst({
      where: eq(confirmedBalance.spaceId, spaceId),
      orderBy: (table, { desc }) => desc(table.confirmedAt),
    });
    if (!checkpoint) throw new Error('Nenhum saldo inicial encontrado.');
    const movements = await tx.query.financialMovement.findMany({
      where: eq(financialMovement.spaceId, spaceId),
    });
    const payments = movements.length
      ? await tx.query.financialPayment.findMany({
          where: (table, { inArray }) =>
            inArray(
              table.movementId,
              movements.map((movement) => movement.id),
            ),
        })
      : [];
    const normalizedMovements = movements.map((movement) => ({
      ...movement,
      direction: movement.direction as 'income' | 'expense',
      status: movement.status as 'pending' | 'realized' | 'canceled',
    }));
    const currentAmountCents = calculateCurrentBalanceCents(
      checkpoint,
      today,
      normalizedMovements,
      payments,
    );
    const differenceCents = targetAmountCents - currentAmountCents;
    if (differenceCents === 0) return null;
    const direction = differenceCents > 0 ? 'income' : 'expense';
    const amountCents = Math.abs(differenceCents);
    const movementId = randomUUID();
    const [created] = await tx
      .insert(financialMovement)
      .values({
        id: movementId,
        spaceId,
        description: 'Ajuste de saldo',
        direction,
        expectedAmountCents: amountCents,
        plannedDate: today,
        status: 'realized',
        realizedAmountCents: amountCents,
        realizedDate: today,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning();
    await tx.insert(financialPayment).values({
      id: randomUUID(),
      movementId,
      amountCents,
      paidDate: today,
      authorId: userId,
    });
    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      movementId,
      authorId: userId,
      action: 'balance_adjustment.create',
      changes: JSON.stringify({ currentAmountCents, targetAmountCents, differenceCents }),
    });
    return created!;
  });
}

export async function createMovementCore(spaceId: string, data: MovementInput, userId: string) {
  const input = validateMovementInput(data);
  const initialStatus = data.initialStatus ?? 'pending';
  if (initialStatus === 'realized' && input.plannedDate > toCivilDate(new Date())) {
    throw new Error('Uma transação realizada não pode ter data futura.');
  }
  await verifyMembership(spaceId, userId);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(financialMovement)
      .values({
        id: randomUUID(),
        spaceId,
        ...input,
        status: initialStatus,
        realizedAmountCents: initialStatus === 'realized' ? input.expectedAmountCents : null,
        realizedDate: initialStatus === 'realized' ? input.plannedDate : null,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning();

    if (initialStatus === 'realized') {
      await tx.insert(financialPayment).values({
        id: randomUUID(),
        movementId: created!.id,
        amountCents: input.expectedAmountCents,
        paidDate: input.plannedDate,
        authorId: userId,
      });
    }

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
        initialStatus,
      }),
    });
    return created!;
  });
}

export async function createRecurrenceCore(spaceId: string, data: RecurrenceInput, userId: string) {
  const input = validateMovementInput(data);
  assertCivilDate(data.effectiveFrom, 'Data inicial');
  if (data.effectiveUntil) assertCivilDate(data.effectiveUntil, 'Data final');
  if (data.effectiveUntil && data.effectiveUntil < data.effectiveFrom) {
    throw new Error('Data final deve ser posterior à inicial.');
  }
  if (
    data.maxOccurrences !== undefined &&
    data.maxOccurrences !== null &&
    (!Number.isSafeInteger(data.maxOccurrences) || data.maxOccurrences < 1)
  ) {
    throw new Error('Quantidade de ocorrências inválida.');
  }
  await verifyMembership(spaceId, userId);

  return db.transaction(async (tx) => {
    const seriesId = randomUUID();
    const ruleId = randomUUID();
    await tx.insert(recurrenceSeries).values({ id: seriesId, spaceId, createdBy: userId });
    const [rule] = await tx
      .insert(recurrenceRuleVersion)
      .values({
        id: ruleId,
        seriesId,
        version: 1,
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil ?? null,
        maxOccurrences: data.maxOccurrences ?? null,
        description: input.description,
        direction: input.direction,
        expectedAmountCents: input.expectedAmountCents,
        cadence: data.cadence,
        createdBy: userId,
      })
      .returning();
    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      authorId: userId,
      action: 'recurrence.create',
      changes: JSON.stringify({ seriesId, ruleId, cadence: data.cadence }),
    });
    return rule!;
  });
}

export async function materializeRecurrenceCore(
  spaceId: string,
  ruleId: string,
  horizonEnd: string,
  userId: string,
) {
  assertCivilDate(horizonEnd, 'Horizonte');
  await verifyMembership(spaceId, userId);
  const rule = await db.query.recurrenceRuleVersion.findFirst({
    where: eq(recurrenceRuleVersion.id, ruleId),
  });
  if (!rule) throw new Error('Not found');
  const series = await db.query.recurrenceSeries.findFirst({
    where: and(eq(recurrenceSeries.id, rule.seriesId), eq(recurrenceSeries.spaceId, spaceId)),
  });
  if (!series) throw new Error('Not found');
  const dates = generateRecurrenceDates(rule, horizonEnd);
  await db.transaction(async (tx) => {
    for (const [index, plannedDate] of dates.entries()) {
      await tx
        .insert(financialMovement)
        .values({
          id: randomUUID(),
          spaceId,
          description: rule.description,
          direction: rule.direction,
          expectedAmountCents: rule.expectedAmountCents,
          plannedDate,
          status: 'pending',
          recurrenceRuleVersionId: rule.id,
          occurrenceSequence: index + 1,
          createdBy: userId,
          updatedBy: userId,
        })
        .onConflictDoNothing();
    }
  });
}

/** Keeps active recurrence occurrences available through the current projection horizon. */
export async function materializeSpaceRecurrencesCore(
  spaceId: string,
  horizonEnd: string,
  userId: string,
) {
  assertCivilDate(horizonEnd, 'Horizonte');
  await verifyMembership(spaceId, userId);
  const rules = await db
    .select({ id: recurrenceRuleVersion.id })
    .from(recurrenceRuleVersion)
    .innerJoin(recurrenceSeries, eq(recurrenceRuleVersion.seriesId, recurrenceSeries.id))
    .where(eq(recurrenceSeries.spaceId, spaceId));
  for (const rule of rules) {
    await materializeRecurrenceCore(spaceId, rule.id, horizonEnd, userId);
  }
}

export async function splitRecurrenceFromHereCore(
  spaceId: string,
  ruleId: string,
  effectiveFrom: string,
  changes: Partial<
    Pick<
      RecurrenceInput,
      | 'description'
      | 'direction'
      | 'expectedAmountCents'
      | 'cadence'
      | 'effectiveUntil'
      | 'maxOccurrences'
    >
  >,
  userId: string,
) {
  assertCivilDate(effectiveFrom, 'Data da exceção');
  await verifyMembership(spaceId, userId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ruleId}))`);
    const current = await tx.query.recurrenceRuleVersion.findFirst({
      where: eq(recurrenceRuleVersion.id, ruleId),
    });
    if (!current) throw new Error('Not found');
    const input = validateMovementInput({
      description: changes.description ?? current.description,
      direction: changes.direction ?? current.direction,
      expectedAmountCents: changes.expectedAmountCents ?? current.expectedAmountCents,
      plannedDate: effectiveFrom,
    });
    const series = await tx.query.recurrenceSeries.findFirst({
      where: and(eq(recurrenceSeries.id, current.seriesId), eq(recurrenceSeries.spaceId, spaceId)),
    });
    if (!series) throw new Error('Not found');
    if (current.effectiveUntil && effectiveFrom > current.effectiveUntil) {
      throw new Error('A série foi alterada por outra pessoa. Atualize e tente novamente.');
    }
    if (effectiveFrom <= current.effectiveFrom)
      throw new Error('A exceção deve ser posterior ao início da série.');
    const previousDay = new Date(`${effectiveFrom}T00:00:00Z`);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);
    const materializedOccurrence = await tx.query.financialMovement.findFirst({
      where: and(
        eq(financialMovement.recurrenceRuleVersionId, ruleId),
        eq(financialMovement.plannedDate, effectiveFrom),
      ),
    });
    const occurrenceSequence =
      materializedOccurrence?.occurrenceSequence ??
      generateRecurrenceDates(current, effectiveFrom).findIndex((date) => date === effectiveFrom) +
        1;
    if (occurrenceSequence < 1) throw new Error('A data não pertence à recorrência.');
    const nextEffectiveUntil =
      changes.effectiveUntil === undefined ? current.effectiveUntil : changes.effectiveUntil;
    if (nextEffectiveUntil) {
      assertCivilDate(nextEffectiveUntil, 'Data final');
      if (nextEffectiveUntil < effectiveFrom)
        throw new Error('Data final deve ser posterior à data da exceção.');
    }
    const nextMaxOccurrences =
      changes.maxOccurrences === undefined
        ? current.maxOccurrences === null
          ? null
          : Math.max(1, current.maxOccurrences - occurrenceSequence + 1)
        : changes.maxOccurrences;
    if (nextMaxOccurrences !== null && nextMaxOccurrences !== undefined) {
      if (!Number.isSafeInteger(nextMaxOccurrences) || nextMaxOccurrences < 1)
        throw new Error('Quantidade de ocorrências inválida.');
    }
    await tx
      .update(recurrenceRuleVersion)
      .set({ effectiveUntil: previousDay.toISOString().slice(0, 10) })
      .where(eq(recurrenceRuleVersion.id, ruleId));
    await tx
      .update(financialMovement)
      .set({ status: 'canceled', updatedBy: userId, updatedAt: new Date() })
      .where(
        and(
          eq(financialMovement.recurrenceRuleVersionId, ruleId),
          eq(financialMovement.status, 'pending'),
          gte(financialMovement.plannedDate, effectiveFrom),
        ),
      );
    const [next] = await tx
      .insert(recurrenceRuleVersion)
      .values({
        id: randomUUID(),
        seriesId: current.seriesId,
        version: current.version + 1,
        effectiveFrom,
        effectiveUntil: nextEffectiveUntil,
        maxOccurrences: nextMaxOccurrences,
        description: input.description,
        direction: input.direction,
        expectedAmountCents: input.expectedAmountCents,
        cadence: changes.cadence ?? current.cadence,
        createdBy: userId,
      })
      .returning();
    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      authorId: userId,
      action: 'recurrence.split',
      changes: JSON.stringify({ previousRuleId: ruleId, nextRuleId: next!.id, effectiveFrom }),
    });
    return next!;
  });
}

export async function updateRecurrenceCore(
  spaceId: string,
  ruleId: string,
  changes: Partial<
    Pick<
      RecurrenceInput,
      | 'description'
      | 'direction'
      | 'expectedAmountCents'
      | 'cadence'
      | 'effectiveUntil'
      | 'maxOccurrences'
    >
  >,
  userId: string,
) {
  await verifyMembership(spaceId, userId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ruleId}))`);
    const current = await tx.query.recurrenceRuleVersion.findFirst({
      where: eq(recurrenceRuleVersion.id, ruleId),
    });
    if (!current) throw new Error('Not found');
    const input = validateMovementInput({
      description: changes.description ?? current.description,
      direction: changes.direction ?? current.direction,
      expectedAmountCents: changes.expectedAmountCents ?? current.expectedAmountCents,
      plannedDate: current.effectiveFrom,
    });
    const effectiveUntil =
      changes.effectiveUntil === undefined ? current.effectiveUntil : changes.effectiveUntil;
    if (effectiveUntil) assertCivilDate(effectiveUntil, 'Data final');
    const maxOccurrences =
      changes.maxOccurrences === undefined ? current.maxOccurrences : changes.maxOccurrences;
    if (
      maxOccurrences !== null &&
      maxOccurrences !== undefined &&
      (!Number.isSafeInteger(maxOccurrences) || maxOccurrences < 1)
    ) {
      throw new Error('Quantidade de ocorrências inválida.');
    }
    await tx
      .update(recurrenceRuleVersion)
      .set({
        description: input.description,
        direction: input.direction,
        expectedAmountCents: input.expectedAmountCents,
        cadence: changes.cadence ?? current.cadence,
        effectiveUntil,
        maxOccurrences,
      })
      .where(eq(recurrenceRuleVersion.id, ruleId));
    await tx
      .update(financialMovement)
      .set({
        description: input.description,
        direction: input.direction,
        expectedAmountCents: input.expectedAmountCents,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financialMovement.recurrenceRuleVersionId, ruleId),
          eq(financialMovement.status, 'pending'),
        ),
      );
    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      authorId: userId,
      action: 'recurrence.update',
      changes: JSON.stringify({ ruleId, scope: 'future', effectiveUntil, maxOccurrences }),
    });
    return current;
  });
}

export async function recordPaymentCore(
  spaceId: string,
  movementId: string,
  amountCents: number,
  paidDate: string,
  version: number,
  userId: string,
) {
  assertPositiveCents(amountCents, 'Pagamento');
  assertCivilDate(paidDate, 'Data do pagamento');
  if (paidDate > toCivilDate(new Date())) throw new Error('Data do pagamento não pode ser futura.');
  await verifyMembership(spaceId, userId);
  return db.transaction(async (tx) => {
    const existing = await tx.query.financialMovement.findFirst({
      where: and(eq(financialMovement.id, movementId), eq(financialMovement.spaceId, spaceId)),
    });
    if (!existing) throw new Error('Not found');
    if (existing.version !== version) throw new Error('Conflict');
    if (existing.status === 'canceled' || existing.status === 'realized')
      throw new Error('Movimentação já finalizada.');
    const payments = await tx.query.financialPayment.findMany({
      where: eq(financialPayment.movementId, movementId),
    });
    const remaining = remainingAmountCents(existing.expectedAmountCents, payments);
    if (amountCents > remaining) throw new Error('Pagamento excede o saldo restante.');
    const total = existing.expectedAmountCents - remaining + amountCents;
    const status = total === existing.expectedAmountCents ? 'realized' : 'pending';
    await tx
      .insert(financialPayment)
      .values({ id: randomUUID(), movementId, amountCents, paidDate, authorId: userId });
    const [updated] = await tx
      .update(financialMovement)
      .set({
        status,
        realizedAmountCents: status === 'realized' ? total : null,
        realizedDate: status === 'realized' ? paidDate : null,
        updatedBy: userId,
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(financialMovement.id, movementId), eq(financialMovement.version, version)))
      .returning();
    if (!updated) throw new Error('Conflict');
    await tx.insert(financialAuditLog).values({
      id: randomUUID(),
      spaceId,
      movementId,
      authorId: userId,
      action: 'financial_payment.create',
      changes: JSON.stringify({ amountCents, paidDate }),
    });
    return updated;
  });
}

export async function undoRealizationCore(
  spaceId: string,
  movementId: string,
  version: number,
  userId: string,
) {
  if (!Number.isSafeInteger(version) || version < 1) throw new Error('Versão inválida.');
  await verifyMembership(spaceId, userId);

  return db.transaction(async (tx) => {
    const existing = await tx.query.financialMovement.findFirst({
      where: and(eq(financialMovement.id, movementId), eq(financialMovement.spaceId, spaceId)),
    });
    if (!existing) throw new Error('Not found');
    if (existing.version !== version) throw new Error('Conflict');
    if (existing.status !== 'realized') throw new Error('Movimentação não está realizada.');

    await tx.delete(financialPayment).where(eq(financialPayment.movementId, movementId));
    const [updated] = await tx
      .update(financialMovement)
      .set({
        status: 'pending',
        realizedAmountCents: null,
        realizedDate: null,
        updatedBy: userId,
        updatedAt: new Date(),
        version: existing.version + 1,
      })
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
      action: 'financial_movement.undo_realization',
      changes: JSON.stringify({ previousVersion: version, version: updated.version }),
    });
    return updated;
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
  if (existing.status === 'canceled') throw new Error('Movimentação já finalizada.');

  if (data.status === 'canceled') {
    const payments = await db.query.financialPayment.findMany({
      where: eq(financialPayment.movementId, movementId),
    });
    if (payments.length > 0)
      throw new Error('Não é possível cancelar uma movimentação com pagamentos.');
  }

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
  } else if (
    existing.status !== 'realized' &&
    (input.realizedAmountCents !== undefined || input.realizedDate !== undefined)
  ) {
    throw new Error('Valores realizados exigem uma movimentação realizada.');
  }

  if (existing.status === 'realized') {
    if (input.status !== undefined) throw new Error('Uma realizada não pode mudar de situação.');
    if (input.realizedDate !== undefined) {
      assertCivilDate(input.realizedDate ?? '', 'Data realizada');
      if (input.realizedDate && input.realizedDate > toCivilDate(new Date())) {
        throw new Error('Uma transação realizada não pode ter data futura.');
      }
    }
    input.realizedDate = input.realizedDate ?? existing.realizedDate;
    if (input.expectedAmountCents !== undefined) {
      const payments = await db.query.financialPayment.findMany({
        where: eq(financialPayment.movementId, movementId),
      });
      const paid = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
      const currentRealized = existing.realizedAmountCents ?? paid;
      if (input.expectedAmountCents !== currentRealized) {
        throw new Error('O valor realizado deve corresponder ao total pago.');
      }
      input.realizedAmountCents = input.expectedAmountCents;
    }
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

    if (existing.status === 'realized' && input.realizedDate) {
      await tx
        .update(financialPayment)
        .set({ paidDate: input.realizedDate })
        .where(eq(financialPayment.movementId, movementId));
    }

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
