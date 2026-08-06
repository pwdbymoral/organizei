import { describe, expect, it } from 'vitest';
import { resolveAuthSecret } from '../../apps/web/src/lib/runtime-config';

describe('runtime configuration', () => {
  it('rejects missing or short production secrets', () => {
    expect(() => resolveAuthSecret(undefined, undefined)).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => resolveAuthSecret('short-secret', undefined)).toThrow(/32 characters/);
  });

  it('allows a valid secret and only allows a placeholder during the build phase', () => {
    expect(resolveAuthSecret('a'.repeat(32), undefined)).toBe('a'.repeat(32));
    expect(resolveAuthSecret(undefined, 'phase-production-build')).toContain('build-only');
  });
});
