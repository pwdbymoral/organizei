import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { administrativeAudit, account, db, pool, session, user } from '../src';

const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const fail = (message: string): never => {
  throw new Error(message);
};
async function password(fromStdin: boolean): Promise<string> {
  if (fromStdin) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    const value = Buffer.concat(chunks).toString('utf8').trimEnd();
    return value.length >= 12 ? value : fail('Password must contain at least 12 characters.');
  }
  if (!process.stdin.isTTY) return fail('Password requires an interactive TTY.');
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write('Senha: ');
  execFileSync('stty', ['-echo'], { stdio: 'inherit' });
  try {
    const value = await reader.question('');
    return value.length >= 12 ? value : fail('Password must contain at least 12 characters.');
  } finally {
    execFileSync('stty', ['echo'], { stdio: 'inherit' });
    reader.close();
    process.stdout.write('\n');
  }
}
async function _audit(action: string, targetUserId: string | null, targetEmail: string) {
  await db
    .insert(administrativeAudit)
    .values({ id: randomUUID(), action, targetUserId, targetEmail });
}
async function main() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET)
    fail('DATABASE_URL and BETTER_AUTH_SECRET are required.');
  if (process.env.NODE_ENV === 'production' && process.env.ORGANIZEI_ADMIN_CONFIRM !== 'yes')
    fail('Set ORGANIZEI_ADMIN_CONFIRM=yes in production.');
  const args = process.argv.slice(2);
  const passwordFromStdin = args.at(-1) === '--password-stdin';
  if (passwordFromStdin) args.pop();
  const [command, email, name] = args;
  if (!command) fail('Missing command.');
  if (command === 'list') {
    console.table(
      await db
        .select({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt })
        .from(user),
    );
    return;
  }
  if (!email || !emailOk(email)) fail('A valid email is required.');
  const found = await db.select().from(user).where(eq(user.email, email));
  const target = found[0];
  if (command === 'create') {
    if (target) fail('User already exists.');
    if (!name?.trim()) fail('A display name is required.');
    const secret = await password(passwordFromStdin);
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(user).values({ id, name: name.trim(), email, emailVerified: true });
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: id,
        providerId: 'credential',
        userId: id,
        password: await hashPassword(secret),
      });
      await tx
        .insert(administrativeAudit)
        .values({ id: randomUUID(), action: 'user.create', targetUserId: id, targetEmail: email });
    });
    console.log('User created.');
    return;
  }
  if (!target) fail('User not found.');
  if (command === 'reset-password') {
    const secret = await password(passwordFromStdin);
    await db.transaction(async (tx) => {
      await tx
        .update(account)
        .set({ password: await hashPassword(secret), updatedAt: new Date() })
        .where(eq(account.userId, target.id));
      await tx.delete(session).where(eq(session.userId, target.id));
      await tx.insert(administrativeAudit).values({
        id: randomUUID(),
        action: 'user.reset-password',
        targetUserId: target.id,
        targetEmail: email,
      });
    });
    console.log('Password reset and sessions revoked.');
    return;
  }
  if (command === 'revoke-sessions') {
    await db.transaction(async (tx) => {
      await tx.delete(session).where(eq(session.userId, target.id));
      await tx.insert(administrativeAudit).values({
        id: randomUUID(),
        action: 'user.revoke-sessions',
        targetUserId: target.id,
        targetEmail: email,
      });
    });
    console.log('Sessions revoked.');
    return;
  }
  fail('Unknown command.');
}
void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Administrative command failed.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
