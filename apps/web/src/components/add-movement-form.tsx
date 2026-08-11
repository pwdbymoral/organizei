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
  const [state, action, pending] = useActionState(
    createFinancialMovementFormAction,
    initialFinancialFormState,
  );
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date());

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      setCadence('once');
      setInitialStatus('realized');
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
          onValueChange={(value) => setInitialStatus(value as typeof initialStatus)}
        >
          <TabsList className="grid h-auto w-full grid-cols-2">
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
        <div className="flex gap-2">
          <Input
            id="plannedDate"
            name="plannedDate"
            type="date"
            defaultValue={today}
            onChange={(event) => {
              if (event.target.value > today) setInitialStatus('pending');
            }}
            required
            className={`${inputClass} flex-1`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.getElementById('plannedDate') as HTMLInputElement | null;
              if (input) input.value = today;
            }}
          >
            Hoje
          </Button>
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
