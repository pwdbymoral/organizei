export const e2eProjects = ['chromium', 'webkit'] as const;

export type E2eProject = (typeof e2eProjects)[number];

export function runInParallel<T>(
  items: readonly T[],
  run: (item: T) => Promise<number>,
): Promise<number[]> {
  return Promise.all(items.map(run));
}
