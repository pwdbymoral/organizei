import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { diagnosePlaywright } from './e2e-doctor';

const composeArgs = ['docker', 'compose', '-f', 'compose.e2e.yaml', '-p', 'organizei-e2e'];

function runCommand(args: string[], stdio: 'ignore' | 'inherit' = 'inherit'): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), { env: process.env, stdio });
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

async function waitForPostgres(): Promise<void> {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    if (
      (await runCommand(
        [
          ...composeArgs,
          'exec',
          '-T',
          'postgres',
          'pg_isready',
          '-U',
          'organizei',
          '-d',
          'organizei',
        ],
        'ignore',
      )) === 0
    ) {
      return;
    }
    await delay(1_000);
  }

  await runCommand([...composeArgs, 'logs', 'postgres']);
  throw new Error('PostgreSQL E2E não ficou disponível.');
}

async function cleanup(): Promise<void> {
  await runCommand([...composeArgs, 'down', '--volumes', '--remove-orphans'], 'ignore').catch(
    () => undefined,
  );
}

async function main(): Promise<void> {
  process.env.BETTER_AUTH_SECRET ??= randomBytes(32).toString('hex');
  process.env.DATABASE_URL ??=
    'postgresql://organizei:organizei_local_only@127.0.0.1:55433/organizei';
  process.env.BETTER_AUTH_URL ??= 'http://127.0.0.1:3000';
  process.env.E2E_BASE_URL ??= 'http://127.0.0.1:3000';
  process.env.ORGANIZEI_E2E = 'true';
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= `${process.cwd()}/.cache/ms-playwright`;

  await cleanup();
  try {
    if ((await runCommand([...composeArgs, 'up', '-d', 'postgres'])) !== 0) {
      throw new Error('Não foi possível iniciar o PostgreSQL E2E.');
    }
    await waitForPostgres();
    await diagnosePlaywright();

    const result = await runCommand(['pnpm', 'exec', 'tsx', 'scripts/ci/run-e2e.ts']);
    if (result !== 0) process.exit(result);
  } finally {
    await cleanup();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
