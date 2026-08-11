'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFinancialMovementFormAction } from '../actions/financial';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const initialFinancialFormState = { status: 'idle' as const, message: '' };

export function AddMovementForm({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [cadence, setCadence] = useState('once');
  const [initialStatus, setInitialStatus] = useState<'realized' | 'pending'>('realized');
  const [plannedDate, setPlannedDate] = useState('');
  const [state, action, pending] = useActionState(
    createFinancialMovementFormAction,
    initialFinancialFormState,
  );
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date());

  useEffect(() => {
    setPlannedDate(today);
  }, [today]);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      setCadence('once');
      setInitialStatus('realized');
      setPlannedDate(today);
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="initialStatus" value={initialStatus} />
      <div className="grid gap-2">
        <span className="text-sm font-medium">Situação</span>
        <Tabs
          value={initialStatus}
          onValueChange={(value) => {
            const next = value as typeof initialStatus;
            setInitialStatus(next);
            if (next === 'realized' && plannedDate > today) setPlannedDate(today);
          }}
        >
          <TabsList className="grid !h-auto min-h-11 w-full grid-cols-2">
            <TabsTrigger value="realized" className="min-h-11">
              Já aconteceu
            </TabsTrigger>
            <TabsTrigger value="pending" className="min-h-11">
              Está previsto
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="direction">
          <Select name="direction" defaultValue="expense">
            <SelectTrigger id="direction" className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Saída</SelectItem>
              <SelectItem value="income">Entrada</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Valor (R$)" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            pattern="\d+([,.]\d{1,2})?"
            placeholder="0,00"
            required
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Descrição" htmlFor="description">
        <Input
          id="description"
          name="description"
          required
          maxLength={160}
          placeholder="Ex.: almoço, salário, aluguel"
          className={inputClass}
        />
      </Field>
      <Field
        label={initialStatus === 'realized' ? 'Aconteceu em' : 'Previsto para'}
        htmlFor="plannedDate"
      >
        <div className="grid gap-2 sm:flex">
          <Input
            id="plannedDate"
            name="plannedDate"
            type="date"
            value={plannedDate || today}
            onChange={(event) => {
              setPlannedDate(event.target.value);
              if (event.target.value > today) setInitialStatus('pending');
            }}
            required
            className={`${inputClass} flex-1`}
          />
          <div className="flex flex-wrap gap-2">
            {datePresets(initialStatus, today).map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant={preset.value === plannedDate ? 'secondary' : 'outline'}
                size="sm"
                className="min-h-12"
                onClick={() => setPlannedDate(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </Field>

      <div className="border-border bg-surface rounded-2xl border p-4">
        <Field label="Repetição ou parcelamento" htmlFor="cadence">
          <Select
            name="cadence"
            value={cadence}
            onValueChange={(nextCadence) => {
              setCadence(nextCadence);
              if (nextCadence !== 'once') setInitialStatus('pending');
            }}
          >
            <SelectTrigger id="cadence" className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Não repetir</SelectItem>
              <SelectItem value="weekly">Repetir toda semana</SelectItem>
              <SelectItem value="monthly">Repetir todo mês</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {cadence !== 'once' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Até esta data (opcional)" htmlFor="effectiveUntil">
              <Input id="effectiveUntil" name="effectiveUntil" type="date" className={inputClass} />
            </Field>
            <Field label="Ou quantidade de vezes" htmlFor="maxOccurrences">
              <Input
                id="maxOccurrences"
                name="maxOccurrences"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="Ex.: 12"
                className={inputClass}
              />
            </Field>
          </div>
        )}
        <p className="text-text-muted mt-3 text-xs">
          Use uma opção para contas recorrentes ou compras parceladas.
        </p>
      </div>

      {state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="text-sm"
        >
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          onClick={() => router.replace('/app')}
          variant="outline"
          className="flex-1"
        >
          Concluir
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? 'Salvando…' : state.status === 'success' ? 'Adicionar outra' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium" htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  );
}

const inputClass = 'min-h-12 w-full';

function datePresets(status: 'realized' | 'pending', today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  const shift = (days: number) => {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
  };
  const startOfMonth = `${today.slice(0, 8)}01`;
  if (status === 'realized') {
    return [
      { label: 'Hoje', value: today },
      { label: 'Ontem', value: shift(-1) },
      { label: 'Início do mês', value: startOfMonth },
    ];
  }
  const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return [
    { label: 'Hoje', value: today },
    { label: 'Amanhã', value: shift(1) },
    { label: 'Em 7 dias', value: shift(7) },
    { label: 'Próximo mês', value: nextMonth.toISOString().slice(0, 10) },
  ];
}
