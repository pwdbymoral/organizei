import { describe, expect, test } from 'vitest';
import { e2eProjects, runInParallel } from '../../scripts/ci/e2e-contract';

describe('E2E execution contract', () => {
  test('starts all browser projects before waiting for completion', async () => {
    const started: string[] = [];
    let releaseAll: () => void = () => undefined;
    const allStarted = new Promise<void>((resolve) => {
      releaseAll = resolve;
    });

    const results = await runInParallel(e2eProjects, async (project) => {
      started.push(project);
      if (started.length === e2eProjects.length) releaseAll();
      await allStarted;
      return 0;
    });

    expect(started).toEqual([...e2eProjects]);
    expect(results).toEqual([0, 0]);
  });
});
