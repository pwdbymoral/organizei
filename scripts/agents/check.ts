import { readFile, readdir } from 'node:fs/promises';

async function main() {
  const canonical = await readFile('AGENTS.md', 'utf8');
  for (const file of ['CLAUDE.md', 'GEMINI.md'])
    if ((await readFile(file, 'utf8')) !== canonical)
      throw new Error(`${file} is stale; run pnpm agents:sync`);
  const skills = await readdir('.agents/skills', { withFileTypes: true });
  for (const skill of skills.filter((entry) => entry.isDirectory())) {
    const content = await readFile(`.agents/skills/${skill.name}/SKILL.md`, 'utf8');
    if (!content.startsWith('---\nname:'))
      throw new Error(`Invalid skill frontmatter: ${skill.name}`);
  }
  JSON.parse(await readFile('.agents/skills.lock.json', 'utf8'));
  console.log('Agent instructions and skills are valid.');
}
void main();
