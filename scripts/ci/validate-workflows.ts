import { readdir, readFile } from 'node:fs/promises';

const workflowDirectory = '.github/workflows';
const sha = /^[a-f0-9]{40}$/;

async function main(): Promise<void> {
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
      const pkg = JSON.parse(await readFile('package.json', 'utf8'));
      const expectedPlaywrightVersion =
        pkg.devDependencies?.['@playwright/test'] || pkg.dependencies?.['@playwright/test'];
      if (!expectedPlaywrightVersion)
        throw new Error('Could not find @playwright/test version in package.json');

      const imageRegex = new RegExp(
        `image:\\s*mcr\\.microsoft\\.com/playwright:v${expectedPlaywrightVersion}-noble(?:@sha256:[a-f0-9]{64})?`,
      );
      if (!imageRegex.test(content)) {
        throw new Error(
          `ci.yml: E2E container image must be exactly mcr.microsoft.com/playwright:v${expectedPlaywrightVersion}-noble (optionally with sha256 digest).`,
        );
      }

      if (!/options:\s*--user\s+\d+/.test(content)) {
        throw new Error(
          'ci.yml: E2E container must specify a non-root user (options: --user 1001).',
        );
      }

      if (/playwright\s+install/.test(content)) {
        throw new Error('ci.yml: "playwright install" is forbidden.');
      }

      const e2eSection = content.split('e2e:')[1];
      if (e2eSection) {
        if (/services:\s*\n\s+postgres:[\s\S]*?\n\s+ports:/.test(e2eSection)) {
          throw new Error('ci.yml: E2E PostgreSQL service must not publish ports.');
        }

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
