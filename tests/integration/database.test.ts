import { randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const password = 'synthetic-password-123';
let container: StartedTestContainer;
let databaseUrl: string;

async function command(args: string[], input = '', env: NodeJS.ProcessEnv = {}) {
  return await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['exec', 'tsx', 'packages/database/scripts/admin-user.ts', ...args],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          BETTER_AUTH_SECRET: ['synthetic', 'test', 'auth', 'secret', 'for', 'integration'].join(
            '-',
          ),
          ...env,
        },
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.end(input);
  });
}

describe('administrative CLI with PostgreSQL', () => {
  beforeAll(async () => {
    container = await new GenericContainer('postgres:17-alpine')
      .withEnvironment({ POSTGRES_DB: 'test', POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test' })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();
    databaseUrl = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/test`;
    await execFileAsync('pnpm', ['db:migrate'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  }, 60_000);

  afterAll(async () => container.stop());

  it('executes create, list, reset and session revocation without leaking secrets', async () => {
    const email = 'admin-cli@example.test';
    const created = await command(
      ['create', email, 'Admin CLI', '--password-stdin'],
      `${password}\n`,
    );
    expect(created).toMatchObject({ code: 0 });
    expect(`${created.stdout}${created.stderr}`).not.toContain(password);

    const duplicate = await command(
      ['create', email, 'Admin CLI', '--password-stdin'],
      `${password}\n`,
    );
    expect(duplicate.code).not.toBe(0);
    expect(`${duplicate.stdout}${duplicate.stderr}`).toContain('User already exists.');
    expect(`${duplicate.stdout}${duplicate.stderr}`).not.toContain(password);
    expect(
      (await command(['create', 'invalid', 'Name', '--password-stdin'], `${password}\n`)).code,
    ).not.toBe(0);
    expect((await command(['list'])).stdout).toContain(email);

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    const user = await client.query<{ id: string }>('select id from "user" where email = $1', [
      email,
    ]);
    await client.query(
      "insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 day')",
      [randomUUID(), 'revoked-session-token', user.rows[0]?.id],
    );
    expect((await command(['revoke-sessions', email])).code).toBe(0);
    expect(
      (await client.query('select * from session where token = $1', ['revoked-session-token']))
        .rowCount,
    ).toBe(0);

    await client.query(
      "insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 day')",
      [randomUUID(), 'reset-session-token', user.rows[0]?.id],
    );
    const reset = await command(['reset-password', email, '--password-stdin'], `${password}\n`);
    expect(reset.code).toBe(0);
    expect(
      (await client.query('select * from session where token = $1', ['reset-session-token']))
        .rowCount,
    ).toBe(0);
    expect(
      (
        await client.query('select action from administrative_audit where target_email = $1', [
          email,
        ])
      ).rows,
    ).toEqual(
      expect.arrayContaining([
        { action: 'user.create' },
        { action: 'user.revoke-sessions' },
        { action: 'user.reset-password' },
      ]),
    );
    await client.end();

    expect((await command(['list'], '', { DATABASE_URL: '' })).code).not.toBe(0);
    expect((await command(['list'], '', { BETTER_AUTH_SECRET: '' })).code).not.toBe(0);
    expect(
      (await command(['list'], '', { NODE_ENV: 'production', ORGANIZEI_ADMIN_CONFIRM: '' })).code,
    ).not.toBe(0);
  });
});
