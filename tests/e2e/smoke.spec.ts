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
test('service worker caches only the public shell @pwa', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Cache Storage coverage is Chromium-only.');
  await page.goto('/login');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  const cachedUrls = await page.evaluate(async () =>
    Promise.all((await caches.keys()).map(async (name) => (await caches.open(name)).keys())).then(
      (groups) => groups.flat().map((request) => new URL(request.url).pathname),
    ),
  );
  expect(cachedUrls).toEqual(
    expect.arrayContaining(['/offline', '/manifest.webmanifest', '/icon.svg']),
  );
  expect(cachedUrls).not.toEqual(expect.arrayContaining(['/app', '/api/auth/sign-in/email']));
});
test('authentication, protected route, theme and logout @a11y @pwa', async ({ page }) => {
  await page.goto('/app/more');
  await expect(page).toHaveURL(/\/login/);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-mail').fill('ana@example.test');
  await page.getByLabel('Senha').fill('senha-sintetica-segura-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('link', { name: 'Mais' }).first().click();
  await expect(page.getByRole('heading', { name: 'Mais' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(320);
  await page.goto('/app/more');
  await expect(page.getByLabel('Tema').getByRole('button', { name: 'Escuro' })).toBeEnabled();
  await page.getByLabel('Tema').getByRole('button', { name: 'Escuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByLabel('Tema').getByRole('button', { name: 'Claro' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.evaluate(async () => {
    localStorage.setItem('organizei-sensitive', 'synthetic');
    sessionStorage.setItem('organizei-sensitive', 'synthetic');
    await (await caches.open('organizei-private-test')).put('/private', new Response('synthetic'));
  });
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect
    .poll(() =>
      page.evaluate(async () => ({
        local: localStorage.getItem('organizei-sensitive'),
        session: sessionStorage.getItem('organizei-sensitive'),
        privateCache: (await caches.keys()).includes('organizei-private-test'),
      })),
    )
    .toEqual({ local: null, session: null, privateCache: false });
});
