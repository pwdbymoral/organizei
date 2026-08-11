'use client';

import { useState } from 'react';
import type { MonthlyProjection } from '@organizei/domain';
import { MonthlyProjectionChart } from './monthly-projection-chart';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

export function MonthlyProjectionSection({ data }: { data: MonthlyProjection[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-border bg-surface rounded-3xl border p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Próximos meses</h2>
      <p className="text-text-muted mt-1 text-sm">
        Uma visão rápida do saldo estimado no fim de cada mês. Valores negativos ficam abaixo da
        linha zero.
      </p>
      <div className="mt-5">
        <MonthlyProjectionChart data={data.slice(0, 6)} />
      </div>
      {data.length > 6 && (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-5">
          <CollapsibleTrigger asChild>
            <Button variant="link" className="px-0">
              {open ? 'Mostrar menos' : 'Ver mais meses'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <MonthlyProjectionChart data={data.slice(6)} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}
