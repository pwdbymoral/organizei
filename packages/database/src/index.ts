import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const databaseUrl = process.env.DATABASE_URL;
export const pool = new Pool({ connectionString: databaseUrl, max: 10 });
export const db = drizzle({ client: pool, schema });
export * from './schema';
