import { createWriteStream, mkdirSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const projects = ['chromium', 'webkit'] as const;
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const serverLog = process.env.E2E_SERVER_LOG ?? '/tmp/organizei-e2e-server.log';
const outputDirectory = 'test-results';

type Project = (typeof projects)[number];
const activePlaywrightProcesses = new Set<ChildProcess>();

function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

function waitForProcess(child: ChildProcess): Promise<number> {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);

  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

function sendSignal(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.exitCode !== null) return;

  try {
    if (child.pid && process.platform !== 'win32') {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    // The process may have exited between the exitCode check and the signal.
  }
}

async function terminateProcess(child: ChildProcess, exit: Promise<number>): Promise<void> {
  sendSignal(child, 'SIGTERM');
  await Promise.race([exit, delay(5_000)]);
  if (child.exitCode === null) {
    sendSignal(child, 'SIGKILL');
    await exit;
  }
}

async function waitForApplication(server: ChildProcess): Promise<void> {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`A aplicação encerrou antes de ficar disponível (exit ${server.exitCode}).`);
    }

    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // The development server is still starting.
    }

    await delay(1_000);
  }

  throw new Error(`Aplicação não ficou disponível em ${baseUrl}.`);
}

async function runPlaywright(project: Project): Promise<number> {
  const logPath = `${outputDirectory}/${project}.log`;
  const log = createWriteStream(logPath);
  const child = spawn(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      `--project=${project}`,
      '--workers=1',
      `--output=${outputDirectory}/${project}`,
    ],
    { detached: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  activePlaywrightProcesses.add(child);
  const exit = waitForProcess(child);

  child.stdout?.on('data', (chunk: Buffer) => {
    log.write(chunk);
    process.stdout.write(`[${project}] ${chunk}`);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    log.write(chunk);
    process.stderr.write(`[${project}] ${chunk}`);
  });

  try {
    return await exit;
  } catch (error) {
    log.write(`${String(error)}\n`);
    return 1;
  } finally {
    activePlaywrightProcesses.delete(child);
    log.end();
  }
}

async function main(): Promise<void> {
  mkdirSync('apps/web/.next', { recursive: true });
  mkdirSync(outputDirectory, { recursive: true });

  const migrations = await runCommand('pnpm', ['db:migrate']);
  if (migrations !== 0) process.exit(migrations);

  const seed = await runCommand('pnpm', ['db:seed']);
  if (seed !== 0) process.exit(seed);

  const serverLogStream = createWriteStream(serverLog);
  const server = spawn('pnpm', ['dev'], {
    detached: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.pipe(serverLogStream);
  server.stderr?.pipe(serverLogStream);
  const serverExit = waitForProcess(server);

  const stopServer = (): void => {
    sendSignal(server, 'SIGTERM');
    for (const child of activePlaywrightProcesses) sendSignal(child, 'SIGTERM');
  };
  process.once('SIGINT', stopServer);
  process.once('SIGTERM', stopServer);

  try {
    await waitForApplication(server);

    const results = await Promise.all(projects.map(runPlaywright));
    const failed = results.filter((code) => code !== 0);
    if (failed.length > 0) {
      throw new Error(`${failed.length} projeto(s) Playwright falharam.`);
    }
  } finally {
    await Promise.all([
      terminateProcess(server, serverExit).catch(() => undefined),
      ...[...activePlaywrightProcesses].map((child) =>
        terminateProcess(child, waitForProcess(child)).catch(() => undefined),
      ),
    ]);
    serverLogStream.end();
    process.removeListener('SIGINT', stopServer);
    process.removeListener('SIGTERM', stopServer);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
