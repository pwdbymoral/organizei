import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { account, confirmedBalance, db, familyMembership, familySpace, pool, user } from '../src';

const demoSpaceId = 'demo-space-family';
const demoUserId = 'demo-user-ana';
async function main() {
  // Clear any existing demo user data to force credential hashes update
  await db.delete(familySpace).where(eq(familySpace.id, demoSpaceId)).execute();
  await db.delete(account).where(eq(account.id, 'demo-account-ana')).execute();
  await db.delete(confirmedBalance).where(eq(confirmedBalance.authorId, demoUserId)).execute();
  await db.delete(user).where(eq(user.id, demoUserId)).execute();

  await db
    .insert(familySpace)
    .values({ id: demoSpaceId, name: 'Espaço Demonstração' })
    .onConflictDoNothing({ target: familySpace.id });

  await db.insert(user).values({
    id: demoUserId,
    name: 'Ana Demonstração',
    email: 'ana@example.test',
    emailVerified: true,
  });

  await db.insert(account).values({
    id: 'demo-account-ana',
    accountId: demoUserId,
    providerId: 'credential',
    userId: demoUserId,
    password: await hashPassword('senha-sintetica-segura-123'),
  });

  await db.insert(familyMembership).values({
    id: 'demo-membership-ana',
    spaceId: demoSpaceId,
    userId: demoUserId,
    role: 'admin',
  });
  await pool.end();
}
void main();
