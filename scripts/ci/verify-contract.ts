export const parallelVerifyChecks = [
  'format:check',
  'lint',
  'typecheck',
  'test:unit',
  'test:integration',
  'agents:check',
  'ci:check-workflows',
  'db:check',
] as const;

export const finalVerifyChecks = ['build'] as const;

export type ParallelVerifyCheck = (typeof parallelVerifyChecks)[number];
export type FinalVerifyCheck = (typeof finalVerifyChecks)[number];
