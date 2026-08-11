import { describe, expect, it } from 'vitest';
import {
  matchesTimelineFilters,
  parseMoneyFilter,
  parseTimelineFilters,
  resolveTimelinePeriod,
  resolvePaymentDate,
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

  it('defaults the timeline to the current month and supports an all view', () => {
    expect(resolveTimelinePeriod({}, '2026-08-11')).toMatchObject({
      mode: 'month',
      from: '2026-08-01',
      to: '2026-08-31',
    });
    expect(resolveTimelinePeriod({ month: '2027-02' }, '2026-08-11')).toMatchObject({
      mode: 'month',
      from: '2027-02-01',
      to: '2027-02-28',
    });
    expect(resolveTimelinePeriod({ view: 'all' }, '2026-08-11')).toMatchObject({
      mode: 'all',
      from: '',
      to: '',
    });
  });

  it('uses the realized date when filtering a completed movement by period', () => {
    const movement = {
      description: 'Compra',
      direction: 'expense' as const,
      expectedAmountCents: 5000,
      plannedDate: '2026-07-31',
      realizedDate: '2026-08-01',
      status: 'realized' as const,
    };
    expect(
      matchesTimelineFilters(
        movement,
        parseTimelineFilters({ from: '2026-08-01', to: '2026-08-31' }),
        '2026-08-11',
      ),
    ).toBe(true);
  });

  it('uses the planned date for overdue payments and today for early payments', () => {
    expect(resolvePaymentDate('2026-08-03', '2026-08-11')).toBe('2026-08-03');
    expect(resolvePaymentDate('2026-08-15', '2026-08-11')).toBe('2026-08-11');
  });
});
