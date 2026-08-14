import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import {
  bootstrapMarker,
  browserCacheDirectory,
  browserCacheReady,
  playwrightVersion,
} from './e2e-bootstrap';

function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

export async function setupPlaywright(): Promise<void> {
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserCacheDirectory;
  mkdirSync(browserCacheDirectory, { recursive: true });

  if (browserCacheReady() && process.env.CI !== 'true') {
    console.log(`Playwright ${playwrightVersion} já está preparado em ${browserCacheDirectory}.`);
    return;
  }

  if (process.platform !== 'linux') {
    throw new Error('O E2E oficial exige Linux para reproduzir o ambiente do CI.');
  }

  console.log(
    `${browserCacheReady() ? 'Verificando dependências nativas' : 'Instalando Playwright'} ${playwrightVersion}, Chromium, WebKit e dependências do sistema...`,
  );
  const result = await runCommand('pnpm', [
    'exec',
    'playwright',
    'install',
    '--with-deps',
    'chromium',
    'webkit',
  ]);
  if (result !== 0) {
    throw new Error(
      'Não foi possível preparar o Playwright. Em Linux, o comando precisa de APT e permissão sudo para instalar dependências nativas.',
    );
  }

  writeFileSync(bootstrapMarker, '');
  console.log(`Playwright preparado em ${browserCacheDirectory}.`);
}

if (process.argv[1]?.endsWith('e2e-setup.ts')) {
  setupPlaywright().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
