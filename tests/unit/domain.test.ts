import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateDailyProjection,
  calculateDailyProjectionWithPayments,
  calculateCashSummary,
  calculateCurrentBalanceCents,
  calculateMonthlyProjection,
  generateRecurrenceDates,
  remainingAmountCents,
  type OpeningBalance,
  type ConfirmedBalance,
} from '../../packages/domain/src/index';

const toDateString = (d: Date) => {
  if (isNaN(d.getTime())) return '2025-01-01';
  return d.toISOString().split('T')[0];
};

// Robust date generator to prevent Invalid Date (NaN) generation during fast-check shrinking
const dateArb = fc
  .integer({
    min: new Date('2025-01-01T00:00:00Z').getTime(),
    max: new Date('2025-12-31T23:59:59Z').getTime(),
  })
  .map((ts) => new Date(ts));

const validMovementArb = fc.record({
  id: fc.uuid(),
  spaceId: fc.uuid(),
  description: fc.string(),
  direction: fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>,
  expectedAmountCents: fc.integer({ min: 1, max: 100000000 }),
  plannedDate: dateArb.map(toDateString),
  status: fc.constantFrom('pending', 'realized', 'canceled') as fc.Arbitrary<
    'pending' | 'realized' | 'canceled'
  >,
  realizedAmountCents: fc.option(fc.integer({ min: 1, max: 100000000 }), { nil: null }),
  realizedDate: fc.option(dateArb.map(toDateString), { nil: null }),
  createdBy: fc.uuid(),
  updatedBy: fc.uuid(),
  createdAt: dateArb,
  updatedAt: dateArb,
  version: fc.integer({ min: 1 }),
});

describe('DailyProjectionEngine invariants', () => {
  it('uses the real opening balance and ignores historical events before it', () => {
    const opening: OpeningBalance = {
      spaceId: 'space-1',
      amountCents: 10_000,
      effectiveAt: new Date('2025-01-10T15:00:00Z'),
      authorId: 'user-1',
      createdAt: new Date('2025-01-10T15:00:00Z'),
    };
    const historical = {
      id: 'historical',
      spaceId: 'space-1',
      description: 'Histórico',
      direction: 'expense' as const,
      expectedAmountCents: 5_000,
      plannedDate: '2025-01-09',
      status: 'realized' as const,
      realizedAmountCents: 5_000,
      realizedDate: '2025-01-09',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date('2025-01-09T12:00:00Z'),
      updatedAt: new Date('2025-01-09T12:00:00Z'),
      version: 1,
    };
    const afterOpening = {
      ...historical,
      id: 'after',
      realizedDate: '2025-01-10',
      plannedDate: '2025-01-10',
      createdAt: new Date('2025-01-10T16:00:00Z'),
      updatedAt: new Date('2025-01-10T16:00:00Z'),
    };

    expect(
      calculateCurrentBalanceCents(opening, '2025-01-10', [historical, afterOpening], []),
    ).toBe(5_000);
  });

  it('generates weekly and month-end recurrence dates within limits', () => {
    const weekly = generateRecurrenceDates(
      {
        id: 'weekly',
        seriesId: 'series',
        version: 1,
        effectiveFrom: '2025-01-01',
        maxOccurrences: 3,
        description: 'Semanal',
        direction: 'expense',
        expectedAmountCents: 100,
        cadence: 'weekly',
      },
      '2025-02-01',
    );
    expect(weekly).toEqual(['2025-01-01', '2025-01-08', '2025-01-15']);
    expect(
      generateRecurrenceDates(
        {
          id: 'monthly',
          seriesId: 'series',
          version: 1,
          effectiveFrom: '2025-01-31',
          description: 'Mensal',
          direction: 'expense',
          expectedAmountCents: 100,
          cadence: 'monthly',
        },
        '2025-04-30',
      ),
    ).toEqual(['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30']);
  });

  it('derives remaining partial-payment balance and rejects overpayment', () => {
    expect(
      remainingAmountCents(1_000, [
        { id: 'p1', movementId: 'm1', amountCents: 400, paidDate: '2025-01-01' },
      ]),
    ).toBe(600);
    expect(() =>
      remainingAmountCents(1_000, [
        { id: 'p1', movementId: 'm1', amountCents: 1_001, paidDate: '2025-01-01' },
      ]),
    ).toThrow();
  });

  it('derives current balance from cash events after the latest checkpoint exactly once', () => {
    const checkpoint: ConfirmedBalance = {
      spaceId: 'space-1',
      amountCents: 10_000,
      confirmedAt: new Date('2025-01-10T15:00:00Z'),
      authorId: 'user-1',
      createdAt: new Date('2025-01-10T15:00:00Z'),
    };
    const movements = [
      {
        id: 'before-checkpoint',
        spaceId: 'space-1',
        description: 'Já incluído',
        direction: 'expense' as const,
        expectedAmountCents: 500,
        plannedDate: '2025-01-09',
        status: 'realized' as const,
        realizedAmountCents: 500,
        realizedDate: '2025-01-10',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      {
        id: 'after-checkpoint',
        spaceId: 'space-1',
        description: 'Pago depois',
        direction: 'expense' as const,
        expectedAmountCents: 1_000,
        plannedDate: '2025-01-12',
        status: 'pending' as const,
        realizedAmountCents: null,
        realizedDate: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    ];
    expect(
      calculateCurrentBalanceCents(checkpoint, '2025-01-13', movements, [
        {
          id: 'payment-1',
          movementId: 'after-checkpoint',
          amountCents: 400,
          paidDate: '2025-01-12',
        },
      ]),
    ).toBe(9_600);
  });

  it('includes a same-day payment only when it was registered after the checkpoint', () => {
    const checkpoint: ConfirmedBalance = {
      spaceId: 'space-1',
      amountCents: 0,
      confirmedAt: new Date('2025-01-10T15:00:00Z'),
      authorId: 'user-1',
      createdAt: new Date('2025-01-10T15:00:00Z'),
    };
    const movement = {
      id: 'salary',
      spaceId: 'space-1',
      description: 'Salário',
      direction: 'income' as const,
      expectedAmountCents: 174_300,
      plannedDate: '2025-01-10',
      status: 'realized' as const,
      realizedAmountCents: 174_300,
      realizedDate: '2025-01-10',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date('2025-01-10T16:00:00Z'),
      updatedAt: new Date('2025-01-10T16:00:00Z'),
      version: 1,
    };
    expect(
      calculateCurrentBalanceCents(
        checkpoint,
        '2025-01-10',
        [movement],
        [
          {
            id: 'payment-after',
            movementId: 'salary',
            amountCents: 174_300,
            paidDate: '2025-01-10',
            createdAt: new Date('2025-01-10T16:00:00Z'),
          },
        ],
      ),
    ).toBe(174_300);
    expect(
      calculateCurrentBalanceCents(
        checkpoint,
        '2025-01-10',
        [movement],
        [
          {
            id: 'payment-before',
            movementId: 'salary',
            amountCents: 174_300,
            paidDate: '2025-01-10',
            createdAt: new Date('2025-01-10T14:00:00Z'),
          },
        ],
      ),
    ).toBe(0);
  });

  it('reconstructs historical cash events when the opening balance is a starting point', () => {
    const checkpoint: ConfirmedBalance = {
      spaceId: 'space-1',
      amountCents: 0,
      confirmedAt: new Date('2025-01-10T15:00:00Z'),
      authorId: 'user-1',
      createdAt: new Date('2025-01-10T15:00:00Z'),
    };
    const movement = {
      id: 'historical-income',
      spaceId: 'space-1',
      description: 'Salário',
      direction: 'income' as const,
      expectedAmountCents: 174_300,
      plannedDate: '2025-01-03',
      status: 'realized' as const,
      realizedAmountCents: 174_300,
      realizedDate: '2025-01-03',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date('2025-01-03T12:00:00Z'),
      updatedAt: new Date('2025-01-03T12:00:00Z'),
      version: 1,
    };

    expect(
      calculateCurrentBalanceCents(
        checkpoint,
        '2025-01-10',
        [movement],
        [{ id: 'payment', movementId: movement.id, amountCents: 174_300, paidDate: '2025-01-03' }],
        'reconstruct_history',
      ),
    ).toBe(174_300);
  });

  it('starts reconstruction projections from historical realized events', () => {
    const checkpoint: ConfirmedBalance = {
      spaceId: 'space-1',
      amountCents: 0,
      confirmedAt: new Date('2025-01-10T15:00:00Z'),
      authorId: 'user-1',
      createdAt: new Date('2025-01-10T15:00:00Z'),
    };
    const movement = {
      id: 'historical-income',
      spaceId: 'space-1',
      description: 'Salário',
      direction: 'income' as const,
      expectedAmountCents: 174_300,
      plannedDate: '2025-01-03',
      status: 'realized' as const,
      realizedAmountCents: 174_300,
      realizedDate: '2025-01-03',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date('2025-01-03T12:00:00Z'),
      updatedAt: new Date('2025-01-03T12:00:00Z'),
      version: 1,
    };
    expect(
      calculateDailyProjectionWithPayments(
        checkpoint,
        '2025-01-10',
        [movement],
        [],
        1,
        'reconstruct_history',
      ).daily[0]?.balanceCents,
    ).toBe(174_300);
  });

  it('calculates conservative free cash through the next income and falls back to month end', () => {
    const checkpoint: ConfirmedBalance = {
      spaceId: 'space-1',
      amountCents: 10_000,
      confirmedAt: new Date('2025-01-01T12:00:00Z'),
      authorId: 'user-1',
      createdAt: new Date('2025-01-01T12:00:00Z'),
    };
    const base = {
      spaceId: 'space-1',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
    const summary = calculateCashSummary(
      checkpoint,
      '2025-01-05',
      [
        {
          ...base,
          id: 'rent',
          description: 'Aluguel',
          direction: 'expense' as const,
          expectedAmountCents: 2_000,
          plannedDate: '2025-01-08',
          status: 'pending' as const,
        },
        {
          ...base,
          id: 'income',
          description: 'Recebimento',
          direction: 'income' as const,
          expectedAmountCents: 5_000,
          plannedDate: '2025-01-10',
          status: 'pending' as const,
        },
      ],
      [],
    );
    expect(summary).toMatchObject({
      currentBalanceCents: 10_000,
      freeCashCents: 8_000,
      freeCashThrough: '2025-01-10',
      nextIncomeDate: '2025-01-10',
    });
  });

  it('does not project a realized movement as a pending balance', () => {
    const result = calculateDailyProjectionWithPayments(
      {
        spaceId: 'space-1',
        amountCents: 1_000,
        confirmedAt: new Date('2025-01-01T00:00:00Z'),
        authorId: 'user-1',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
      '2025-01-01',
      [
        {
          id: 'realized',
          spaceId: 'space-1',
          description: 'Conta paga',
          direction: 'expense',
          expectedAmountCents: 400,
          plannedDate: '2025-01-02',
          status: 'realized',
          realizedAmountCents: 400,
          realizedDate: '2025-01-02',
          createdBy: 'user-1',
          updatedBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ],
      [],
      3,
    );
    expect(result.daily.map((day) => day.balanceCents)).toEqual([1_000, 600, 600]);
  });

  it('aggregates a twelve-month view from daily projection', () => {
    const result = calculateMonthlyProjection(
      {
        spaceId: 's1',
        amountCents: 1_000,
        confirmedAt: new Date('2025-01-01T00:00:00Z'),
        authorId: 'a1',
        createdAt: new Date(),
      },
      '2025-01-01',
      [],
      12,
    );
    expect(result).toHaveLength(12);
    expect(result[0]).toMatchObject({ month: '2025-01', balanceCents: 1_000 });
  });
  it('applies overdue pending movements today and avoids duplicating realizations in a checkpoint', () => {
    const balance: ConfirmedBalance = {
      spaceId: 'space-1',
      amountCents: 10_000,
      confirmedAt: new Date('2025-01-10T15:00:00Z'),
      authorId: 'user-1',
      createdAt: new Date('2025-01-10T15:00:00Z'),
    };
    const base = {
      spaceId: 'space-1',
      description: 'movement',
      expectedAmountCents: 1_000,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      version: 1,
    };

    const result = calculateDailyProjection(
      balance,
      '2025-01-12',
      [
        {
          ...base,
          id: 'realized-in-checkpoint',
          direction: 'expense',
          plannedDate: '2025-01-09',
          status: 'realized',
          realizedAmountCents: 1_000,
          realizedDate: '2025-01-10',
        },
        {
          ...base,
          id: 'overdue-pending',
          direction: 'expense',
          plannedDate: '2025-01-11',
          status: 'pending',
        },
      ],
      1,
    );

    expect(result.daily).toEqual([
      { date: '2025-01-12', balanceCents: 9_000, incomeCents: 0, expenseCents: 1_000 },
    ]);
  });

  it('running projection twice gives same result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        dateArb,
        dateArb,
        fc.integer({ min: 1, max: 30 }),
        fc.array(validMovementArb),
        (balance, confirmedAt, currentDate, horizon, movements) => {
          const cb: ConfirmedBalance = {
            spaceId: 's1',
            amountCents: balance,
            confirmedAt,
            authorId: 'a1',
            createdAt: new Date(),
          };
          const res1 = calculateDailyProjection(cb, toDateString(currentDate), movements, horizon);
          const res2 = calculateDailyProjection(cb, toDateString(currentDate), movements, horizon);
          expect(res1).toEqual(res2);
        },
      ),
    );
  });

  it('canceled movement does not affect balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        dateArb,
        dateArb,
        fc.integer({ min: 1, max: 30 }),
        validMovementArb,
        (balance, confirmedAt, currentDate, horizon, mov) => {
          const cb: ConfirmedBalance = {
            spaceId: 's1',
            amountCents: balance,
            confirmedAt,
            authorId: 'a1',
            createdAt: new Date(),
          };
          const canceledMov = { ...mov, status: 'canceled' as const };
          const resWith = calculateDailyProjection(
            cb,
            toDateString(currentDate),
            [canceledMov],
            horizon,
          );
          const resWithout = calculateDailyProjection(cb, toDateString(currentDate), [], horizon);
          expect(resWith.daily).toEqual(resWithout.daily);
        },
      ),
    );
  });

  it('expense always reduces balance', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), validMovementArb, (balance, mov) => {
        const cb: ConfirmedBalance = {
          spaceId: 's1',
          amountCents: balance,
          confirmedAt: new Date('2025-01-01T00:00:00Z'),
          authorId: 'a1',
          createdAt: new Date(),
        };
        const expenseMov = {
          ...mov,
          direction: 'expense' as const,
          status: 'pending' as const,
          plannedDate: '2025-01-05',
        };
        const resWith = calculateDailyProjection(cb, '2025-01-05', [expenseMov], 1);
        const resWithout = calculateDailyProjection(cb, '2025-01-05', [], 1);

        expect(resWith.daily[0].balanceCents).toBeLessThan(resWithout.daily[0].balanceCents);
      }),
    );
  });

  it('income always increases balance', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), validMovementArb, (balance, mov) => {
        const cb: ConfirmedBalance = {
          spaceId: 's1',
          amountCents: balance,
          confirmedAt: new Date('2025-01-01T00:00:00Z'),
          authorId: 'a1',
          createdAt: new Date(),
        };
        const incomeMov = {
          ...mov,
          direction: 'income' as const,
          status: 'pending' as const,
          plannedDate: '2025-01-05',
        };
        const resWith = calculateDailyProjection(cb, '2025-01-05', [incomeMov], 1);
        const resWithout = calculateDailyProjection(cb, '2025-01-05', [], 1);

        expect(resWith.daily[0].balanceCents).toBeGreaterThan(resWithout.daily[0].balanceCents);
      }),
    );
  });

  it('order of movements does not matter', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.array(validMovementArb, { minLength: 2, maxLength: 5 }),
        (balance, movements) => {
          const cb: ConfirmedBalance = {
            spaceId: 's1',
            amountCents: balance,
            confirmedAt: new Date('2025-01-01T00:00:00Z'),
            authorId: 'a1',
            createdAt: new Date(),
          };
          const resOriginal = calculateDailyProjection(cb, '2025-01-05', movements, 5);
          const resReversed = calculateDailyProjection(
            cb,
            '2025-01-05',
            [...movements].reverse(),
            5,
          );
          expect(resOriginal).toEqual(resReversed);
        },
      ),
    );
  });
});
