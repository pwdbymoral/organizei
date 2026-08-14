import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, webkit } from '@playwright/test';
import {
  bootstrapMarker,
  browserCacheDirectory,
  browserCacheReady,
  playwrightVersion,
} from './e2e-bootstrap';

const execFileAsync = promisify(execFile);

export async function diagnosePlaywright(): Promise<void> {
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserCacheDirectory;
  console.log(`Node: ${process.version}`);
  console.log(`Playwright: ${playwrightVersion}`);
  console.log(`Browser cache: ${browserCacheDirectory}`);

  if (!browserCacheReady()) {
    throw new Error(`Bootstrap ausente (${bootstrapMarker}); execute pnpm e2e:setup.`);
  }

  let installedBrowsers: string;
  try {
    ({ stdout: installedBrowsers } = await execFileAsync(
      'pnpm',
      ['exec', 'playwright', 'install', '--list'],
      { env: process.env, maxBuffer: 1024 * 1024 },
    ));
  } catch {
    throw new Error('Não foi possível listar os browsers Playwright instalados.');
  }

  for (const browser of ['chromium', 'webkit']) {
    if (!installedBrowsers.includes(`${browserCacheDirectory}/${browser}-`)) {
      throw new Error(
        `Instalação efetiva de ${browser} não encontrada em ${browserCacheDirectory}.`,
      );
    }
  }

  await Promise.all(
    [chromium, webkit].map(async (browserType) => {
      const instance = await browserType.launch({ headless: true });
      await instance.close();
    }),
  ).catch(() => {
    throw new Error('Não foi possível iniciar Chromium e WebKit; verifique dependências nativas.');
  });
  console.log('Playwright e browsers estão preparados.');
}

if (process.argv[1]?.endsWith('e2e-doctor.ts')) {
  diagnosePlaywright().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
