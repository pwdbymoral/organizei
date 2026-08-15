'use client';

import { useRouter } from 'next/navigation';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

export function ProjectionRangeSelector({ days }: { days: number }) {
  const router = useRouter();
  return (
    <ToggleGroup
      type="single"
      value={String(days)}
      onValueChange={(value) => {
        if (value) router.push('/app/projection?days=' + value);
      }}
      variant="outline"
      aria-label="Horizonte da previsão"
    >
      {[30, 90, 180, 365].map((value) => (
        <ToggleGroupItem key={value} value={String(value)} aria-label={value + ' dias'}>
          {value} dias
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
