import { copyFile, mkdir } from 'node:fs/promises';

const adapters = ['CLAUDE.md', 'GEMINI.md'];
async function main() {
  await mkdir('.claude/skills', { recursive: true });
  await Promise.all(adapters.map((file) => copyFile('AGENTS.md', file)));
  console.log('Agent adapters synchronized from AGENTS.md.');
}
void main();
