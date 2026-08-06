import { pool } from '@organizei/database';
import { healthResponse } from '../../../lib/health';

export async function GET() {
  return await healthResponse(() => pool.query('select 1'));
}
