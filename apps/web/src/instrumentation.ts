import path from 'node:path';
import fs from 'node:fs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { db } = await import('@organizei/database');

    const migrationsFolder = findMigrationsFolder();

    console.log('[Migration] Starting automatic database migration on startup...');
    console.log(`[Migration] Using migrations folder: ${migrationsFolder}`);

    try {
      const { migrate } = await import('drizzle-orm/node-postgres/migrator');
      await migrate(db, { migrationsFolder });
      console.log('[Migration] Database migration completed successfully.');
    } catch (err) {
      console.error('[Migration] Database migration failed:', err);
      throw err;
    }
  }
}

function findMigrationsFolder(): string {
  // Candidate 1: Production container path (relative to process.cwd() /app)
  const prodPath = path.resolve(process.cwd(), 'packages/database/drizzle');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // Candidate 2: Next.js dev server run from apps/web
  const devPathWeb = path.resolve(process.cwd(), '../../packages/database/drizzle');
  if (fs.existsSync(devPathWeb)) {
    return devPathWeb;
  }

  // Candidate 3: Next.js dev server run from root
  const devPathRoot = path.resolve(process.cwd(), 'packages/database/drizzle');
  if (fs.existsSync(devPathRoot)) {
    return devPathRoot;
  }

  // Fallback to default production path
  return prodPath;
}
