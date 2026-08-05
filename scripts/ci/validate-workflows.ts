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
  }
  console.log(`Validated ${files.length} workflow files.`);
}
void main();
