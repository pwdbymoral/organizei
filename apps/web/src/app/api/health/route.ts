import { pool } from '@organizei/database';
export async function GET() {
  try {
    await pool.query('select 1');
    return Response.json({ status: 'ok', database: 'reachable' });
  } catch {
    return Response.json({ status: 'degraded', database: 'unreachable' }, { status: 503 });
  }
}
