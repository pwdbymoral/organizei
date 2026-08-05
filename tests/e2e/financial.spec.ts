import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  db,
  user,
  account,
  familySpace,
  familyMembership,
  financialMovement,
  financialPayment,
} from '../../packages/database/src/index';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';

test.describe('Financial Vertical Slice E2E Flow', () => {
  let space1Id: string;
  let space2Id: string;
  let userAId: string;
  let userBId: string;
  let userCId: string;

  let emailA: string;
  let emailB: string;
  let emailC: string;
  const loginPhrase = ['senha', 'sintetica', 'segura', '123'].join('-');

  test.beforeAll(async () => {
    // Generate unique emails and IDs per test run to prevent concurrent Playwright worker collisions
    const runId = randomUUID().substring(0, 8);
    emailA = `financial-a-${runId}@example.test`;
    emailB = `financial-b-${runId}@example.test`;
    emailC = `financial-c-${runId}@example.test`;

    // 1. Create family spaces
    space1Id = randomUUID();
    space2Id = randomUUID();

    await db.insert(familySpace).values([
      { id: space1Id, name: `Espaço A&B ${runId}` },
      { id: space2Id, name: `Espaço C ${runId}` },
    ]);

    // 2. Create users
    userAId = randomUUID();
    userBId = randomUUID();
    userCId = randomUUID();

    await db.insert(user).values([
      { id: userAId, name: 'Usuário A', email: emailA, emailVerified: true },
      { id: userBId, name: 'Usuário B', email: emailB, emailVerified: true },
      { id: userCId, name: 'Usuário C', email: emailC, emailVerified: true },
    ]);

    // 3. Create Better Auth accounts
    const hashed = await hashPassword(loginPhrase);
    await db.insert(account).values([
      {
        id: randomUUID(),
        accountId: userAId,
        providerId: 'credential',
        userId: userAId,
        password: hashed,
      },
      {
        id: randomUUID(),
        accountId: userBId,
        providerId: 'credential',
        userId: userBId,
        password: hashed,
      },
      {
        id: randomUUID(),
        accountId: userCId,
        providerId: 'credential',
        userId: userCId,
        password: hashed,
      },
    ]);

    // 4. Create memberships
    await db.insert(familyMembership).values([
      { id: randomUUID(), spaceId: space1Id, userId: userAId, role: 'admin' },
      { id: randomUUID(), spaceId: space1Id, userId: userBId, role: 'member' },
      { id: randomUUID(), spaceId: space2Id, userId: userCId, role: 'admin' },
    ]);
  });

  test.afterAll(async () => {
    // Clean up spaces to trigger cascading delete
    if (space1Id && space2Id) {
      const movements = await db
        .select({ id: financialMovement.id })
        .from(financialMovement)
        .where(inArray(financialMovement.spaceId, [space1Id, space2Id]));
      if (movements.length) {
        await db
          .delete(financialPayment)
          .where(
            inArray(
              financialPayment.movementId,
              movements.map((movement) => movement.id),
            ),
          )
          .execute();
      }
      await db
        .delete(familySpace)
        .where(inArray(familySpace.id, [space1Id, space2Id]))
        .execute();
    }
    const emails = [emailA, emailB, emailC];
    await db.delete(user).where(inArray(user.email, emails)).execute();
  });

  test('collaborative financial flow between two space members and adversarial isolation', async ({
    browser,
  }) => {
    // --- Step 1: Login User A (Space 1 Admin) ---
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.goto('/login');
    await pageA.getByLabel('E-mail').fill(emailA);
    await pageA.getByLabel('Senha').fill(loginPhrase);
    await pageA.getByRole('button', { name: 'Entrar' }).click();

    // Check redirection to dashboard
    await expect(pageA.getByText('Espaço familiar compartilhado')).toBeVisible({ timeout: 15000 });

    // Verify accessibility of dashboard @a11y
    expect(await new AxeBuilder({ page: pageA }).analyze()).toHaveProperty('violations', []);

    // Confirm initial state (R$ 0,00)
    await expect(pageA.getByText('R$ 0,00').first()).toBeVisible();

    // --- Step 2: Confirm new balance ---
    await pageA.getByPlaceholder('Ajustar saldo (R$)').fill('100.00');
    await pageA.getByRole('button', { name: 'Confirmar' }).click();
    await expect(pageA.getByText('R$ 100,00').first()).toBeVisible();

    // --- Step 3: Add transactions (Income and Expense) ---
    await pageA.getByRole('link', { name: '+ Movimentação' }).click();
    await expect(pageA.getByRole('heading', { name: 'Adição rápida' })).toBeVisible();

    // Add Income
    await pageA.getByLabel('Descrição').fill('Salário Mensal');
    await pageA.getByLabel('Tipo').selectOption('income');
    await pageA.getByLabel('Valor').fill('50.00');
    // Set planned date to today in Maceió timezone
    const today = new Date().toISOString().split('T')[0];
    await pageA.getByLabel('Data Planejada').fill(today);
    await pageA.getByRole('button', { name: 'Salvar' }).click();

    // Verify redirect and updated projection balance (100 + 50 = 150)
    await expect(pageA.getByText('R$ 150,00').first()).toBeVisible();
    await expect(pageA.getByText('Salário Mensal')).toBeVisible();

    // Add Expense (that makes projection drop, we will set a future one to check projection)
    await pageA.getByRole('link', { name: '+ Movimentação' }).click();
    await pageA.getByLabel('Descrição').fill('Conta de Luz');
    await pageA.getByLabel('Tipo').selectOption('expense');
    await pageA.getByLabel('Valor').fill('30.00');
    await pageA.getByLabel('Data Planejada').fill(today);
    await pageA.getByRole('button', { name: 'Salvar' }).click();

    // Balance should be R$ 120,00 (150 - 30)
    await expect(pageA.getByText('R$ 120,00').first()).toBeVisible();
    await expect(pageA.getByText('Conta de Luz')).toBeVisible();

    // Recurring movement plus an occurrence-only exception must remain operable on mobile.
    await pageA.getByRole('link', { name: '+ Movimentação' }).click();
    await pageA.getByLabel('Repetição').selectOption('monthly');
    await pageA.getByLabel('Descrição').fill('Mensalidade');
    await pageA.getByLabel('Valor (R$)').fill('20,00');
    await pageA.getByLabel('Data planejada').fill(today);
    await pageA.getByRole('button', { name: 'Salvar' }).click();
    const recurringEntry = pageA.getByText('Mensalidade', { exact: true }).first();
    await expect(recurringEntry).toBeVisible();

    const recurringCard = recurringEntry.locator('xpath=../..');
    await recurringCard.getByRole('button', { name: 'Editar esta' }).click();
    const occurrenceDialog = pageA.getByRole('dialog', { name: 'Editar esta ocorrência' });
    await expect(occurrenceDialog).toBeVisible();
    await occurrenceDialog.getByLabel('Descrição').fill('Mensalidade ajustada');
    await occurrenceDialog.getByRole('button', { name: 'Salvar ocorrência' }).click();
    await expect(pageA.getByText('Mensalidade ajustada', { exact: true }).first()).toBeVisible();

    await pageA.setViewportSize({ width: 375, height: 800 });
    await expect
      .poll(() => pageA.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    // --- Step 5: Login User B (same space, different context) ---
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('/login');
    await pageB.getByLabel('E-mail').fill(emailB);
    await pageB.getByLabel('Senha').fill(loginPhrase);
    await pageB.getByRole('button', { name: 'Entrar' }).click();

    // User B should see Space 1 data
    await expect(pageB.getByText('Espaço familiar compartilhado')).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByText('R$ 120,00').first()).toBeVisible();
    await expect(pageB.getByText('Salário Mensal')).toBeVisible();

    // --- Step 6: User B realizes a transaction ---
    // Click "Realizar" for Luz
    await pageB.getByRole('button', { name: 'Realizar' }).first().click();

    // Check updated status to "Realizado"
    await expect(pageB.getByText('Realizado', { exact: true })).toBeVisible();

    // --- Step 8: Login User C (adversary in other space, different context) ---
    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();

    await pageC.goto('/login');
    await pageC.getByLabel('E-mail').fill(emailC);
    await pageC.getByLabel('Senha').fill(loginPhrase);
    await pageC.getByRole('button', { name: 'Entrar' }).click();

    // User C should see clean/empty state for Space 2
    await expect(pageC.getByText('Espaço familiar compartilhado')).toBeVisible({ timeout: 15000 });
    await expect(pageC.getByText('R$ 0,00').first()).toBeVisible();
    await expect(pageC.getByText('Nenhuma movimentação cadastrada.')).toBeVisible();

    // Verify User C cannot see Space 1 transactions
    await expect(pageC.getByText('Salário Mensal')).not.toBeVisible();
    await expect(pageC.getByText('Conta de Luz')).not.toBeVisible();

    // Clean up sessions
    await contextA.close();
    await contextB.close();
    await contextC.close();
  });
});
