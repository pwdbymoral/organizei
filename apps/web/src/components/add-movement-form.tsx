'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFinancialMovementFormAction } from '../actions/financial';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

const initialFinancialFormState = { status: 'idle' as const, message: '' };

export function AddMovementForm({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [cadence, setCadence] = useState('once');
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const [initialStatus, setInitialStatus] = useState<'realized' | 'pending'>('realized');
  const [plannedDate, setPlannedDate] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
      setDirection('expense');
      setInitialStatus('realized');
      setPlannedDate(today);
      setAdvancedOpen(false);
    }
  }, [state.status, today]);

  function changeStatus(value: string) {
    const next = value as typeof initialStatus;
    if (next !== 'realized' && next !== 'pending') return;
    setInitialStatus(next);
    if (next === 'realized' && plannedDate > today) setPlannedDate(today);
    if (next === 'pending') setAdvancedOpen(true);
  }

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="initialStatus" value={initialStatus} />
      <input type="hidden" name="direction" value={direction} />

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="amount">
          Valor (R$)
        </label>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          pattern="\d+([,.]\d{1,2})?"
          placeholder="0,00"
          required
          autoFocus
          className={inputClass}
        />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <span className="text-sm font-medium">Tipo</span>
          <ToggleGroup
            type="single"
            value={direction}
            onValueChange={(value) => {
              if (value === 'income' || value === 'expense') setDirection(value);
            }}
            variant="outline"
            spacing={0}
            aria-label="Tipo da transação"
            className="grid min-h-12 w-full grid-cols-2"
          >
            <ToggleGroupItem value="expense" className="min-h-12">
              Saída
            </ToggleGroupItem>
            <ToggleGroupItem value="income" className="min-h-12">
              Entrada
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium">Situação</span>
          <ToggleGroup
            type="single"
            value={initialStatus}
            onValueChange={changeStatus}
            variant="outline"
            spacing={0}
            aria-label="Situação da transação"
            className="grid min-h-12 w-full grid-cols-2"
          >
            <ToggleGroupItem value="realized" className="min-h-12">
              Já aconteceu
            </ToggleGroupItem>
            <ToggleGroupItem value="pending" className="min-h-12">
              Está previsto
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <Collapsible
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        className="border-border rounded-2xl border"
      >
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="min-h-12 w-full justify-between px-4">
            <span>Mais opções</span>
            <span aria-hidden="true">{advancedOpen ? '−' : '+'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-5 border-t px-4 pb-4 pt-4">
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

          <div className="grid gap-2">
            <Field label="Repetição ou parcelamento" htmlFor="cadence">
              <Select
                name="cadence"
                value={cadence}
                onValueChange={(nextCadence) => {
                  setCadence(nextCadence);
                  if (nextCadence !== 'once') {
                    setInitialStatus('pending');
                    setAdvancedOpen(true);
                  }
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Até esta data (opcional)" htmlFor="effectiveUntil">
                  <Input
                    id="effectiveUntil"
                    name="effectiveUntil"
                    type="date"
                    className={inputClass}
                  />
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
            <p className="text-text-muted text-xs">
              Use uma opção para contas recorrentes ou compras parceladas.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
          Voltar ao início
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
