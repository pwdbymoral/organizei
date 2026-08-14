'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';

type ForecastPoint = { date: string; label: string; balanceCents: number };

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <div>
      <div className="h-64 w-full min-w-0" role="img" aria-label="Gráfico da previsão do saldo">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={240}
          initialDimension={{ width: 600, height: 256 }}
        >
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$ ${Math.round(value / 100)}`}
              width={54}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-primary)', strokeDasharray: '4 4' }}
              formatter={(value) => [
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  Number(value) / 100,
                ),
                'Saldo previsto',
              ]}
              labelFormatter={(label) => `Dia ${label}`}
              contentStyle={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderRadius: 12,
                color: 'var(--color-text)',
              }}
            />
            <ReferenceLine y={0} stroke="var(--color-danger)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="balanceCents"
              stroke="var(--color-primary)"
              strokeWidth={3}
              fill="var(--color-primary)"
              fillOpacity={0.12}
              activeDot={{ r: 6, fill: 'var(--color-primary)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table
        className="absolute overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]"
        style={{ width: 1, height: 1, display: 'block' }}
      >
        <caption>Valores diários da previsão do saldo</caption>
        <thead>
          <tr>
            <th>Data</th>
            <th>Saldo previsto</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.balanceCents / 100}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
