import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@organizei/database';
import * as schema from '@organizei/database/schema';
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  secret: (() => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return 'build-only-placeholder-not-used-at-runtime-32-chars';
    }
    throw new Error('BETTER_AUTH_SECRET must be set and contain at least 32 characters.');
  })(),
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true, disableSignUp: true },
  advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  rateLimit: {
    enabled: process.env.ORGANIZEI_E2E !== 'true',
    window: 60,
    max: 5,
  },
});
