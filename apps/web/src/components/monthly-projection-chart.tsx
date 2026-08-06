import type { MonthlyProjection } from '@organizei/domain';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const month = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

export function MonthlyProjectionChart({ data }: { data: MonthlyProjection[] }) {
  const max = Math.max(...data.map((item) => Math.abs(item.balanceCents)), 1);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.map((item) => {
          const negative = item.balanceCents < 0;
          const height = Math.max(10, Math.round((Math.abs(item.balanceCents) / max) * 100));
          return (
            <div key={item.month} className="border-border bg-background rounded-2xl border p-3">
              <div
                className="bg-surface-elevated flex h-20 items-end justify-center rounded-xl px-4 py-2"
                aria-hidden="true"
              >
                <div
                  className={`w-full max-w-10 rounded-t-lg ${negative ? 'bg-danger' : 'bg-primary'}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <p className="text-text-muted mt-3 text-xs font-medium capitalize">
                {month.format(new Date(`${item.month}-01T12:00:00Z`))}
              </p>
              <p className={`mt-1 text-sm font-semibold ${negative ? 'text-danger' : 'text-text'}`}>
                {money.format(item.balanceCents / 100)}
              </p>
            </div>
          );
        })}
      </div>
      <div
        className="text-text-muted mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs"
        aria-label="Legenda do gráfico"
      >
        <span className="inline-flex items-center gap-2">
          <i className="bg-primary size-2.5 rounded-full" aria-hidden="true" /> saldo positivo
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="bg-danger size-2.5 rounded-full" aria-hidden="true" /> saldo negativo
        </span>
      </div>
    </div>
  );
}
