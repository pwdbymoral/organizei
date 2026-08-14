import { describe, expect, test } from 'vitest';
import { finalVerifyChecks, parallelVerifyChecks } from '../../scripts/ci/verify-contract';

describe('verify execution contract', () => {
  test('runs independent checks in parallel and build after them', () => {
    expect(parallelVerifyChecks).toEqual([
      'format:check',
      'lint',
      'typecheck',
      'test:unit',
      'test:integration',
      'agents:check',
      'ci:check-workflows',
      'db:check',
    ]);
    expect(finalVerifyChecks).toEqual(['build']);
  });
});
