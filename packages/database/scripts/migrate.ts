import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src';

async function main() {
  await migrate(db, { migrationsFolder: 'packages/database/drizzle' });
  await pool.end();
}
void main();
