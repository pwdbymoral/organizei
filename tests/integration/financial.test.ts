import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
let container: StartedTestContainer;
let databaseUrl: string;

let db: typeof import('../../packages/database/src/index').db;
let pool: typeof import('../../packages/database/src/index').pool;
let user: typeof import('../../packages/database/src/index').user;
let familySpace: typeof import('../../packages/database/src/index').familySpace;
let familyMembership: typeof import('../../packages/database/src/index').familyMembership;
let confirmBalanceCore: typeof import('../../apps/web/src/lib/financial-core').confirmBalanceCore;
let createMovementCore: typeof import('../../apps/web/src/lib/financial-core').createMovementCore;
let updateMovementCore: typeof import('../../apps/web/src/lib/financial-core').updateMovementCore;
let deleteMovementCore: typeof import('../../apps/web/src/lib/financial-core').deleteMovementCore;
let deleteRecurrenceOccurrenceCore: typeof import('../../apps/web/src/lib/financial-core').deleteRecurrenceOccurrenceCore;
let createRecurrenceCore: typeof import('../../apps/web/src/lib/financial-core').createRecurrenceCore;
let materializeRecurrenceCore: typeof import('../../apps/web/src/lib/financial-core').materializeRecurrenceCore;
let recordPaymentCore: typeof import('../../apps/web/src/lib/financial-core').recordPaymentCore;
let undoRealizationCore: typeof import('../../apps/web/src/lib/financial-core').undoRealizationCore;
let splitRecurrenceFromHereCore: typeof import('../../apps/web/src/lib/financial-core').splitRecurrenceFromHereCore;
let importFinancialCsvCore: typeof import('../../apps/web/src/lib/financial-core').importFinancialCsvCore;
let clearFinancialWorkspaceCore: typeof import('../../apps/web/src/lib/financial-core').clearFinancialWorkspaceCore;

describe('Financial Domain Integration', () => {
  let userA: string;
  let userB: string;
  let userC: string;
  let space1: string;
  let space2: string;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:17-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_fin',
        POSTGRES_USER: 'test_fin',
        POSTGRES_PASSWORD: 'test_fin_password',
      })
      .withExposedPorts(5432)
      .withSharedMemorySize(256 * 1024 * 1024)
      .withStartupTimeout(120_000)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();
    databaseUrl = `postgresql://test_fin:test_fin_password@${container.getHost()}:${container.getMappedPort(5432)}/test_fin`;

    // Override db connection for tests via env var before importing queries
    process.env.DATABASE_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET = 'test-secret'; // required by better-auth in actions

    // Dynamically import database and action modules after env override
    const dbModule = await import('../../packages/database/src/index');
    db = dbModule.db;
    pool = dbModule.pool;
    user = dbModule.user;
    familySpace = dbModule.familySpace;
    familyMembership = dbModule.familyMembership;

    const actionsModule = await import('../../apps/web/src/lib/financial-core');
    confirmBalanceCore = actionsModule.confirmBalanceCore;
    createMovementCore = actionsModule.createMovementCore;
    updateMovementCore = actionsModule.updateMovementCore;
    deleteMovementCore = actionsModule.deleteMovementCore;
    deleteRecurrenceOccurrenceCore = actionsModule.deleteRecurrenceOccurrenceCore;
    createRecurrenceCore = actionsModule.createRecurrenceCore;
    materializeRecurrenceCore = actionsModule.materializeRecurrenceCore;
    recordPaymentCore = actionsModule.recordPaymentCore;
    undoRealizationCore = actionsModule.undoRealizationCore;
    splitRecurrenceFromHereCore = actionsModule.splitRecurrenceFromHereCore;
    importFinancialCsvCore = actionsModule.importFinancialCsvCore;
    clearFinancialWorkspaceCore = actionsModule.clearFinancialWorkspaceCore;

    await execFileAsync('pnpm', ['db:migrate'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    // Seed test users and spaces
    userA = randomUUID();
    userB = randomUUID();
    userC = randomUUID();
    space1 = randomUUID();
    space2 = randomUUID();

    await db.insert(user).values([
      { id: userA, name: 'User A', email: 'a@example.com' },
      { id: userB, name: 'User B', email: 'b@example.com' },
      { id: userC, name: 'User C', email: 'c@example.com' },
    ]);

    await db.insert(familySpace).values([
      { id: space1, name: 'Space 1' },
      { id: space2, name: 'Space 2' },
    ]);

    await db.insert(familyMembership).values([
      { id: randomUUID(), spaceId: space1, userId: userA, role: 'admin' },
      { id: randomUUID(), spaceId: space1, userId: userB, role: 'member' },
      { id: randomUUID(), spaceId: space2, userId: userC, role: 'admin' },
    ]);
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it('allows user A to confirm balance and create movement in space 1', async () => {
    const cb = await confirmBalanceCore(space1, 10000, userA);
    expect(cb.amountCents).toBe(10000);
    expect(cb.authorId).toBe(userA);

    const mov = await createMovementCore(
      space1,
      {
        description: 'Test Income',
        direction: 'income',
        expectedAmountCents: 5000,
        plannedDate: '2025-10-10',
      },
      userA,
    );

    expect(mov.description).toBe('Test Income');
    expect(mov.createdBy).toBe(userA);
  });

  it('creates an already-realized transaction with its payment atomically', async () => {
    const mov = await createMovementCore(
      space1,
      {
        description: 'Salário recebido',
        direction: 'income',
        expectedAmountCents: 174300,
        plannedDate: '2025-10-11',
        initialStatus: 'realized',
      },
      userA,
    );
    expect(mov.status).toBe('realized');
    expect(mov.realizedAmountCents).toBe(174300);
    const payments = await db.query.financialPayment.findMany({
      where: (table, { eq }) => eq(table.movementId, mov.id),
    });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.amountCents).toBe(174300);

    const updated = await updateMovementCore(
      space1,
      mov.id,
      { description: 'Salário corrigido', expectedAmountCents: 174300 },
      mov.version,
      userA,
    );
    expect(updated.status).toBe('realized');
    expect(updated.description).toBe('Salário corrigido');
  });

  it('undoes a realization, removes its payments and records an audit event', async () => {
    const mov = await createMovementCore(
      space1,
      {
        description: 'Realização acidental',
        direction: 'expense',
        expectedAmountCents: 2500,
        plannedDate: '2025-10-15',
        initialStatus: 'realized',
      },
      userA,
    );

    const undone = await undoRealizationCore(space1, mov.id, mov.version, userB);
    expect(undone.status).toBe('pending');
    expect(undone.realizedDate).toBeNull();
    expect(undone.realizedAmountCents).toBeNull();
    expect(
      await db.query.financialPayment.findMany({
        where: (table, { eq }) => eq(table.movementId, mov.id),
      }),
    ).toHaveLength(0);

    const { financialAuditLog } = await import('../../packages/database/src/index');
    const auditRows = await db.select().from(financialAuditLog);
    expect(
      auditRows.find(
        (row) => row.movementId === mov.id && row.action === 'financial_movement.undo_realization',
      ),
    ).toBeTruthy();
  });

  it('prevents user C from accessing space 1', async () => {
    await expect(confirmBalanceCore(space1, 20000, userC)).rejects.toThrow('Forbidden');
    await expect(
      createMovementCore(
        space1,
        {
          description: 'Hack',
          direction: 'expense',
          expectedAmountCents: 100,
          plannedDate: '2025-10-10',
        },
        userC,
      ),
    ).rejects.toThrow('Forbidden');
  });

  it('handles optimistic concurrency when updating a movement', async () => {
    const mov = await createMovementCore(
      space1,
      {
        description: 'Grocery',
        direction: 'expense',
        expectedAmountCents: 8000,
        plannedDate: '2025-10-12',
      },
      userA,
    );

    // User A updates it
    const updated = await updateMovementCore(
      space1,
      mov.id,
      { description: 'Grocery Updated' },
      mov.version,
      userA,
    );
    expect(updated.version).toBe(mov.version + 1);
    expect(updated.description).toBe('Grocery Updated');

    // User B tries to update with old version (simulating conflict)
    await expect(
      updateMovementCore(space1, mov.id, { description: 'Conflict' }, mov.version, userB),
    ).rejects.toThrow('Conflict');
  });

  it('prevents creating a movement with negative expected amount via DB constraints', async () => {
    await expect(
      createMovementCore(
        space1,
        {
          description: 'Negative',
          direction: 'expense',
          expectedAmountCents: -500, // Should fail constraint
          plannedDate: '2025-10-13',
        },
        userA,
      ),
    ).rejects.toThrow();
  });

  it('writes audit events transactionally for financial changes', async () => {
    const { financialAuditLog } = await import('../../packages/database/src/index');
    const created = await createMovementCore(
      space1,
      {
        description: 'Audited',
        direction: 'income',
        expectedAmountCents: 100,
        plannedDate: '2025-10-14',
      },
      userA,
    );
    await deleteMovementCore(space1, created.id, created.version, userA);
    const auditRows = await db.select().from(financialAuditLog);
    expect(
      auditRows.filter((row) => row.movementId === created.id).map((row) => row.action),
    ).toEqual(['financial_movement.create', 'financial_movement.delete']);
  });

  it('materializes an idempotent recurring series and records partial payments', async () => {
    const rule = await createRecurrenceCore(
      space1,
      {
        description: 'Assinatura',
        direction: 'expense',
        expectedAmountCents: 1_000,
        plannedDate: '2025-01-01',
        cadence: 'monthly',
        effectiveFrom: '2025-01-01',
        maxOccurrences: 2,
      },
      userA,
    );
    await materializeRecurrenceCore(space1, rule.id, '2025-03-31', userA);
    await materializeRecurrenceCore(space1, rule.id, '2025-03-31', userA);
    const { financialMovement } = await import('../../packages/database/src/index');
    const movements = await db.select().from(financialMovement);
    const occurrence = movements.find((movement) => movement.recurrenceRuleVersionId === rule.id)!;
    expect(
      movements.filter((movement) => movement.recurrenceRuleVersionId === rule.id),
    ).toHaveLength(2);
    const partial = await recordPaymentCore(
      space1,
      occurrence.id,
      400,
      '2025-01-01',
      occurrence.version,
      userA,
    );
    expect(partial.status).toBe('pending');
    const realized = await recordPaymentCore(
      space1,
      occurrence.id,
      600,
      '2025-01-01',
      partial.version,
      userB,
    );
    expect(realized.status).toBe('realized');
    expect(realized.realizedDate).toBe('2025-01-01');
    await expect(
      recordPaymentCore(space1, occurrence.id, 1, '2025-01-03', realized.version, userA),
    ).rejects.toThrow();
  });

  it('deletes a pending movement without leaving a canceled record', async () => {
    const movement = await createMovementCore(
      space1,
      {
        description: 'Excluir esta',
        direction: 'expense',
        expectedAmountCents: 100,
        plannedDate: '2025-01-20',
      },
      userA,
    );
    await deleteMovementCore(space1, movement.id, movement.version, userA);
    const { financialMovement } = await import('../../packages/database/src/index');
    expect(
      (await db.select().from(financialMovement)).some((item) => item.id === movement.id),
    ).toBe(false);
  });

  it('starts a recurrence edit after a realized occurrence without duplicating its date', async () => {
    const rule = await createRecurrenceCore(
      space1,
      {
        description: 'Conta recorrente realizada',
        direction: 'expense',
        expectedAmountCents: 100,
        plannedDate: '2025-07-07',
        cadence: 'monthly',
        effectiveFrom: '2025-07-07',
        maxOccurrences: 4,
      },
      userA,
    );
    await materializeRecurrenceCore(space1, rule.id, '2025-10-31', userA);
    const { financialMovement } = await import('../../packages/database/src/index');
    const selected = (await db.select().from(financialMovement)).find(
      (movement) =>
        movement.recurrenceRuleVersionId === rule.id && movement.plannedDate === '2025-08-07',
    )!;
    const realized = await recordPaymentCore(
      space1,
      selected.id,
      100,
      '2025-08-07',
      selected.version,
      userA,
    );
    const next = await splitRecurrenceFromHereCore(
      space1,
      rule.id,
      '2025-08-07',
      { description: 'Conta recorrente ajustada', firstOccurrenceDate: '2025-08-07' },
      userA,
    );
    await materializeRecurrenceCore(space1, next.id, '2025-10-31', userA);
    const updated = await db.select().from(financialMovement);
    expect(realized.status).toBe('realized');
    expect(next.effectiveFrom).toBe('2025-09-07');
    expect(
      updated
        .filter((movement) => movement.recurrenceRuleVersionId === rule.id)
        .map((m) => ({
          date: m.plannedDate,
          status: m.status,
        })),
    ).toEqual([
      { date: '2025-07-07', status: 'pending' },
      { date: '2025-08-07', status: 'realized' },
    ]);
    expect(
      updated
        .filter((movement) => movement.recurrenceRuleVersionId === next.id)
        .map((movement) => movement.plannedDate)
        .sort(),
    ).toEqual(['2025-09-07', '2025-10-07']);
  });

  it('deletes one recurring occurrence without rematerializing it', async () => {
    const rule = await createRecurrenceCore(
      space1,
      {
        description: 'Excluir uma mensalidade',
        direction: 'expense',
        expectedAmountCents: 100,
        plannedDate: '2025-11-01',
        cadence: 'monthly',
        effectiveFrom: '2025-11-01',
        maxOccurrences: 3,
      },
      userA,
    );
    await materializeRecurrenceCore(space1, rule.id, '2026-01-31', userA);
    const { financialMovement, recurrenceRuleVersion } = await import(
      '../../packages/database/src/index'
    );
    await deleteRecurrenceOccurrenceCore(space1, rule.id, '2025-12-01', userA);
    const nextRule = (await db.select().from(recurrenceRuleVersion)).find(
      (item) => item.seriesId === rule.seriesId && item.version === 2,
    )!;
    await materializeRecurrenceCore(space1, nextRule.id, '2026-01-31', userA);
    const occurrences = (await db.select().from(financialMovement)).filter(
      (movement) => movement.recurrenceRuleVersionId === nextRule.id,
    );
    expect(occurrences.map((movement) => movement.plannedDate).sort()).toEqual(['2026-01-01']);
  });

  it('versions a recurrence without changing prior pending history or its remaining installment limit', async () => {
    const rule = await createRecurrenceCore(
      space1,
      {
        description: 'Academia',
        direction: 'expense',
        expectedAmountCents: 100,
        plannedDate: '2025-01-01',
        cadence: 'monthly',
        effectiveFrom: '2025-01-01',
        maxOccurrences: 3,
      },
      userA,
    );
    await materializeRecurrenceCore(space1, rule.id, '2025-03-31', userA);
    const next = await splitRecurrenceFromHereCore(
      space1,
      rule.id,
      '2025-02-01',
      {
        description: 'Academia',
        direction: 'expense',
        expectedAmountCents: 120,
        cadence: 'monthly',
      },
      userA,
    );
    expect(next.version).toBe(2);
    expect(next.effectiveFrom).toBe('2025-02-01');
    expect(next.maxOccurrences).toBe(2);
    const { financialMovement } = await import('../../packages/database/src/index');
    const original = (await db.select().from(financialMovement)).filter(
      (movement) => movement.recurrenceRuleVersionId === rule.id,
    );
    expect(original.find((movement) => movement.plannedDate === '2025-01-01')?.status).toBe(
      'pending',
    );
    expect(original.find((movement) => movement.plannedDate === '2025-02-01')).toBeUndefined();
  });

  it('moves the selected and future monthly occurrences to a new day', async () => {
    const rule = await createRecurrenceCore(
      space1,
      {
        description: 'Cobrança mensal',
        direction: 'expense',
        expectedAmountCents: 500,
        plannedDate: '2025-07-07',
        cadence: 'monthly',
        effectiveFrom: '2025-07-07',
        maxOccurrences: 4,
      },
      userA,
    );
    await materializeRecurrenceCore(space1, rule.id, '2025-10-31', userA);

    const { financialMovement } = await import('../../packages/database/src/index');
    const selected = (await db.select().from(financialMovement)).find(
      (movement) =>
        movement.recurrenceRuleVersionId === rule.id && movement.plannedDate === '2025-08-07',
    )!;
    const next = await splitRecurrenceFromHereCore(
      space1,
      rule.id,
      selected.plannedDate,
      { firstOccurrenceDate: '2025-08-05' },
      userA,
    );
    await materializeRecurrenceCore(space1, next.id, '2025-10-31', userA);

    const updated = await db.select().from(financialMovement);
    expect(
      updated.find(
        (movement) =>
          movement.recurrenceRuleVersionId === rule.id && movement.plannedDate === '2025-08-07',
      ),
    ).toBeUndefined();
    expect(
      updated
        .filter((movement) => movement.recurrenceRuleVersionId === next.id)
        .map((movement) => movement.plannedDate)
        .sort(),
    ).toEqual(['2025-08-05', '2025-09-05', '2025-10-05']);
  });

  it('imports separated planned and paid dates atomically and clears a workspace as admin', async () => {
    const csv = [
      'tipo;descricao;direcao;valor;situacao;data_planejada;data_pagamento;valor_realizado;periodicidade;inicio_recorrencia;fim_recorrencia;quantidade_ocorrencias',
      'transacao;Receita importada;income;100,00;realizada;2025-01-10;2025-01-05;100,00;;;;',
      'recorrencia;Parcela importada;expense;20,00;pendente;2025-01-10;; ;monthly;2025-01-10;;3',
    ].join('\n');
    const result = await importFinancialCsvCore(space2, csv, userC, '2025-01-10');
    expect(result.imported).toBe(2);
    const beforeClear = await db.query.financialMovement.findMany({
      where: (table, { eq }) => eq(table.spaceId, space2),
    });
    expect(beforeClear.some((movement) => movement.realizedDate === '2025-01-05')).toBe(true);
    expect(beforeClear.filter((movement) => movement.recurrenceRuleVersionId)).toHaveLength(3);

    await clearFinancialWorkspaceCore(space2, userC);
    expect(
      await db.query.financialMovement.findMany({
        where: (table, { eq }) => eq(table.spaceId, space2),
      }),
    ).toHaveLength(0);
    expect(
      await db.query.openingBalance.findMany({
        where: (table, { eq }) => eq(table.spaceId, space2),
      }),
    ).toHaveLength(0);
  });

  it('rejects invalid imports before writing and enforces workspace membership', async () => {
    const before = await db.query.financialMovement.findMany({
      where: (table, { eq }) => eq(table.spaceId, space1),
    });
    const invalidCsv = [
      'tipo;descricao;direcao;valor;situacao;data_planejada;data_pagamento;valor_realizado;periodicidade;inicio_recorrencia;fim_recorrencia;quantidade_ocorrencias',
      'transacao;Importação inválida;expense;100,00;realizada;2025-02-31;2025-01-05;100,01;;;;',
    ].join('\n');

    await expect(importFinancialCsvCore(space1, invalidCsv, userA, '2025-01-10')).rejects.toThrow(
      'data_planejada inválida',
    );
    const after = await db.query.financialMovement.findMany({
      where: (table, { eq }) => eq(table.spaceId, space1),
    });
    expect(after).toHaveLength(before.length);

    await expect(importFinancialCsvCore(space2, invalidCsv, userA, '2025-01-10')).rejects.toThrow(
      'Forbidden',
    );
  });
});
