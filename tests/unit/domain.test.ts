import { describe, expect, it } from 'vitest';
import { domainStatus } from '../../packages/domain/src/index';
describe('domain foundation', () => {
  it('does not expose financial behaviour prematurely', () =>
    expect(domainStatus).toBe('foundation-only'));
});
