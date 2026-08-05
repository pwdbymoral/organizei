import { describe, expect, it } from 'vitest';
import { healthResponse } from '../../apps/web/src/app/api/health/route';

describe('health endpoint', () => {
  it('returns readiness only when PostgreSQL responds', async () => {
    const response = await healthResponse(async () => ({}));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', database: 'reachable' });
  });

  it('returns a safe 503 when PostgreSQL is unavailable', async () => {
    const response = await healthResponse(async () => {
      throw new Error('postgresql://user:password@internal:5432/db');
    });
    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe('{"status":"degraded","database":"unreachable"}');
  });
});
