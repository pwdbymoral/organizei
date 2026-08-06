'use client';

import { useMemo, useState } from 'react';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type Point = { date: string; balanceCents: number };

export function ProjectionScenario({ data }: { data: Point[] }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(data[0]?.date ?? '');
  const result = useMemo(() => {
    const cents = Math.round(Number(amount.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents <= 0 || !date) return null;
    const adjusted = data.map((point) =>
      point.date >= date ? point.balanceCents - cents : point.balanceCents,
    );
    return {
      lowest: Math.min(...adjusted),
      negativeDate: data.find((point, index) => adjusted[index]! < 0)?.date ?? null,
    };
  }, [amount, data, date]);

  return (
    <section className="border-border bg-surface rounded-3xl border p-5 sm:p-8">
      <div>
        <p className="text-text-muted text-sm">Antes de decidir</p>
        <h2 className="mt-1 text-xl font-semibold">E se eu gastar um valor?</h2>
        <p className="text-text-muted mt-2 text-sm">Faça um teste sem salvar uma movimentação.</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium" htmlFor="scenario-amount">
          Valor (R$)
          <input
            id="scenario-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="50,00"
            className="border-border bg-background min-h-11 rounded-xl border px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium" htmlFor="scenario-date">
          Quando?
          <select
            id="scenario-date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="border-border bg-background min-h-11 rounded-xl border px-3"
          >
            {data.map((point) => (
              <option key={point.date} value={point.date}>
                {point.date}
              </option>
            ))}
          </select>
        </label>
      </div>
      {result && (
        <div className="border-border bg-background mt-5 rounded-2xl border p-4 text-sm">
          <p>
            O menor saldo previsto passaria a ser{' '}
            <strong>{money.format(result.lowest / 100)}</strong>.
          </p>
          <p className="text-text-muted mt-1">
            {result.negativeDate
              ? `A previsão ficaria negativa em ${result.negativeDate}.`
              : 'A previsão continua positiva neste período.'}
          </p>
        </div>
      )}
    </section>
  );
}
