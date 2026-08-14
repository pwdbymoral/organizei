import { readdir, readFile } from 'node:fs/promises';
import { e2eProjects } from './e2e-contract';

const workflowDirectory = '.github/workflows';
const sha = /^[a-f0-9]{40}$/;

async function main(): Promise<void> {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const expectedE2eScripts = {
    'test:e2e:local': 'tsx scripts/ci/e2e-local.ts',
    'e2e:setup': 'tsx scripts/ci/e2e-setup.ts',
    'e2e:doctor': 'tsx scripts/ci/e2e-doctor.ts',
  };
  for (const [name, expected] of Object.entries(expectedE2eScripts)) {
    if (packageJson.scripts?.[name] !== expected) {
      throw new Error(`package.json: ${name} must use ${expected}.`);
    }
  }

  const files = (await readdir(workflowDirectory)).filter((file) => /\.ya?ml$/.test(file));
  for (const file of files) {
    const content = await readFile(`${workflowDirectory}/${file}`, 'utf8');
    if (/\bpull_request_target\b/.test(content))
      throw new Error(`${file}: pull_request_target is forbidden.`);
    for (const match of content.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s|#|$)/gm)) {
      const reference = match[1];
      if (!reference) continue;
      const pinned = reference.split('@')[1];
      if (!pinned || !sha.test(pinned))
        throw new Error(`${file}: action is not SHA pinned: ${reference}`);
    }
    if (/cache:\s*pnpm/.test(content)) {
      const pnpmPosition = content.indexOf('pnpm/action-setup@');
      const setupNodePosition = content.indexOf('actions/setup-node@');
      if (pnpmPosition < 0 || setupNodePosition < 0 || pnpmPosition > setupNodePosition)
        throw new Error(`${file}: pnpm/action-setup must precede setup-node cache.`);
    }

    if (file === 'ci.yml') {
      if (!content.includes('runs-on: ubuntu-24.04')) {
        throw new Error('ci.yml: E2E job must use the pinned native Ubuntu runner.');
      }
      if (!content.includes('pnpm e2e:setup')) {
        throw new Error('ci.yml: E2E job must prepare Playwright explicitly.');
      }
      if (!content.includes('actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57')) {
        throw new Error('ci.yml: E2E job must cache Playwright browsers.');
      }
      if (!content.includes('PLAYWRIGHT_BROWSERS_PATH:')) {
        throw new Error('ci.yml: E2E job must set PLAYWRIGHT_BROWSERS_PATH explicitly.');
      }
      if (!content.includes('pnpm exec tsx scripts/ci/run-e2e.ts')) {
        throw new Error('ci.yml: E2E job must use the shared TypeScript runner.');
      }

      if (e2eProjects.length !== 2) {
        throw new Error('e2e-contract.ts: exactly two browser projects are required.');
      }

      const e2eSection = content.split('e2e:')[1];
      if (e2eSection) {
        const timeoutMatch = e2eSection.match(/timeout-minutes:\s*(\d+)/);
        if (timeoutMatch) {
          const timeout = parseInt(timeoutMatch[1], 10);
          if (timeout > 25) {
            throw new Error(`ci.yml: E2E job timeout-minutes must be at most 25, got ${timeout}`);
          }
        } else {
          throw new Error('ci.yml: E2E job must specify timeout-minutes.');
        }
      }
    }
  }
  console.log(`Validated ${files.length} workflow files.`);
}
void main();
