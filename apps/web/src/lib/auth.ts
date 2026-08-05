import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@organizei/database';
import * as schema from '@organizei/database/schema';
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  secret: process.env.BETTER_AUTH_SECRET ?? 'build-time-placeholder-never-use-in-production',
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true, disableSignUp: true },
  advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  rateLimit: { enabled: true, window: 60, max: 5 },
});
