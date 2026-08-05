import { readdir } from 'node:fs/promises';
const skills = await readdir('.agents/skills', { withFileTypes: true });
console.log(
  skills
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .join('\n'),
);
