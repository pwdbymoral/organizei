export function resolveAuthSecret(
  secret: string | undefined,
  phase: string | undefined = process.env.NEXT_PHASE,
) {
  if (secret && secret.length >= 32) return secret;
  if (phase === 'phase-production-build') {
    return 'build-only-placeholder-not-used-at-runtime-32-chars';
  }
  throw new Error('BETTER_AUTH_SECRET must be set and contain at least 32 characters.');
}
