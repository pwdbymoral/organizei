import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  devDependencies?: Record<string, string>;
};

export const playwrightVersion = packageJson.devDependencies?.['@playwright/test'];
if (!playwrightVersion) throw new Error('@playwright/test is not declared in package.json.');

export const browserCacheDirectory = resolve(
  process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(process.cwd(), '.cache/ms-playwright'),
);
export const bootstrapMarker = join(
  browserCacheDirectory,
  `.organizei-playwright-${playwrightVersion}-linux.ready`,
);

function containsBrowserDirectory(browser: string): boolean {
  if (!existsSync(browserCacheDirectory)) return false;

  return readdirSync(browserCacheDirectory, { withFileTypes: true }).some(
    (entry) =>
      entry.isDirectory() &&
      (entry.name.startsWith(`${browser}-`) ||
        readdirSync(join(browserCacheDirectory, entry.name), { withFileTypes: true }).some(
          (nested) => nested.isDirectory() && nested.name.startsWith(`${browser}-`),
        )),
  );
}

export function browserCacheReady(): boolean {
  return (
    existsSync(bootstrapMarker) &&
    containsBrowserDirectory('chromium') &&
    containsBrowserDirectory('webkit')
  );
}
