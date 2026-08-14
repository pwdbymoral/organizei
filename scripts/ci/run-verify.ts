import { spawn } from 'node:child_process';
import {
  finalVerifyChecks,
  parallelVerifyChecks,
  type ParallelVerifyCheck,
} from './verify-contract';

function runCheck(check: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    console.log(`\n[verify:${check}] started`);
    const child = spawn('pnpm', [check === 'build' ? 'build' : check], {
      env: process.env,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('close', (code) => {
      const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[verify:${check}] ${code === 0 ? 'passed' : 'failed'} in ${duration}s`);
      resolve(code ?? 1);
    });
  });
}

async function runParallelChecks(checks: readonly ParallelVerifyCheck[]): Promise<void> {
  const results = await Promise.all(checks.map((check) => runCheck(check)));
  const failed = checks.filter((_, index) => results[index] !== 0);
  if (failed.length > 0) {
    throw new Error(`Checks failed: ${failed.join(', ')}`);
  }
}

async function main(): Promise<void> {
  await runParallelChecks(parallelVerifyChecks);

  for (const check of finalVerifyChecks) {
    const result = await runCheck(check);
    if (result !== 0) process.exit(result);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
