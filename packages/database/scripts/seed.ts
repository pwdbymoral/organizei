import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { account, db, pool, user } from '../src';
async function main() {
  await db
    .insert(user)
    .values({
      id: 'demo-user-ana',
      name: 'Ana Demonstração',
      email: 'ana@example.test',
      emailVerified: true,
    })
    .onConflictDoNothing({ target: user.email });
  const found = await db.select().from(user).where(eq(user.email, 'ana@example.test'));
  if (found.length !== 1) throw new Error('Synthetic seed did not converge.');
  await db
    .insert(account)
    .values({
      id: 'demo-account-ana',
      accountId: 'demo-user-ana',
      providerId: 'credential',
      userId: 'demo-user-ana',
      password: await hashPassword('senha-sintetica-segura-123'),
    })
    .onConflictDoNothing({ target: account.id });
  await pool.end();
}
void main();
