import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('login is accessible @a11y', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(await new AxeBuilder({ page }).analyze()).toHaveProperty('violations', []);
});
test('manifest and offline page are available @pwa', async ({ page }) => {
  await page.goto('/manifest.webmanifest');
  await expect(page.locator('body')).toContainText('Organizei');
  await page.goto('/offline');
  await expect(page.getByRole('heading')).toContainText('sem conexão');
});
test('authentication, protected route, theme and logout @a11y @pwa', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-mail').fill('ana@example.test');
  await page.getByLabel('Senha').fill('senha-sintetica-segura-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading')).toContainText('fundação do Organizei');
  await page.getByLabel('Tema').selectOption('dark');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByLabel('Tema').selectOption('light');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login/);
});
