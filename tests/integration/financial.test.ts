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
    await updateMovementCore(space1, created.id, { status: 'canceled' }, created.version, userA);
    const auditRows = await db.select().from(financialAuditLog);
    expect(
      auditRows.filter((row) => row.movementId === created.id).map((row) => row.action),
    ).toEqual(['financial_movement.create', 'financial_movement.update']);
  });
});
