import { describe, expect, it } from 'vitest';
import { GenericContainer, Wait } from 'testcontainers';
describe('PostgreSQL integration', () => {
  it('starts an isolated real database', async () => {
    const container = await new GenericContainer('postgres:17-alpine')
      .withEnvironment({ POSTGRES_DB: 'test', POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test' })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();
    try {
      const result = await container.exec(['pg_isready', '-U', 'test', '-d', 'test']);
      expect(result.exitCode).toBe(0);
    } finally {
      await container.stop();
    }
  });
});
