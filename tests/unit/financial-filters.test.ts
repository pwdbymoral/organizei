import { describe, expect, it } from 'vitest';
import {
  matchesTimelineFilters,
  parseMoneyFilter,
  parseTimelineFilters,
} from '../../apps/web/src/lib/financial-filters';

describe('financial timeline filters', () => {
  it('parses Brazilian money values into cents', () => {
    expect(parseMoneyFilter('10')).toBe(1000);
    expect(parseMoneyFilter('10,50')).toBe(1050);
    expect(parseMoneyFilter('R$ 10,50')).toBe(1050);
    expect(parseMoneyFilter('invalid')).toBeNull();
  });

  it('normalizes query, status and amount bounds', () => {
    expect(
      parseTimelineFilters({ q: '  aluguel ', status: 'overdue', min: '100,00', max: '2.000,00' }),
    ).toMatchObject({
      query: 'aluguel',
      status: 'overdue',
      minAmountCents: 10_000,
      maxAmountCents: 200_000,
    });
  });

  it('matches description, amount, direction and overdue status', () => {
    const movement = {
      description: 'Aluguel mensal',
      direction: 'expense' as const,
      expectedAmountCents: 200_000,
      plannedDate: '2025-01-01',
      status: 'pending' as const,
    };
    expect(
      matchesTimelineFilters(
        movement,
        parseTimelineFilters({
          q: 'ALUGUEL',
          direction: 'expense',
          status: 'overdue',
          min: '2.000,00',
        }),
        '2025-01-10',
      ),
    ).toBe(true);
    expect(
      matchesTimelineFilters(movement, parseTimelineFilters({ q: '500,00' }), '2025-01-10'),
    ).toBe(false);
  });
});
