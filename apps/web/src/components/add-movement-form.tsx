'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFinancialMovementFormAction } from '../actions/financial';

const initialFinancialFormState = { status: 'idle' as const, message: '' };

export function AddMovementForm({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [cadence, setCadence] = useState('once');
  const [state, action, pending] = useActionState(
    createFinancialMovementFormAction,
    initialFinancialFormState,
  );
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date());

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      setCadence('once');
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="spaceId" value={spaceId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="direction">
          <select id="direction" name="direction" defaultValue="expense" className={inputClass}>
            <option value="expense">Saída</option>
            <option value="income">Entrada</option>
          </select>
        </Field>
        <Field label="Valor (R$)" htmlFor="amount">
          <input
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
        <input
          id="description"
          name="description"
          required
          maxLength={160}
          placeholder="Ex.: almoço, salário, aluguel"
          className={inputClass}
        />
      </Field>
      <Field label="Data planejada" htmlFor="plannedDate">
        <div className="flex gap-2">
          <input
            id="plannedDate"
            name="plannedDate"
            type="date"
            defaultValue={today}
            required
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('plannedDate') as HTMLInputElement | null;
              if (input) input.value = today;
            }}
            className="border-border bg-surface-elevated min-h-11 rounded-xl border px-3 text-xs font-semibold"
          >
            Hoje
          </button>
        </div>
      </Field>

      <div className="border-border bg-surface rounded-2xl border p-4">
        <Field label="Repetição ou parcelamento" htmlFor="cadence">
          <select
            id="cadence"
            name="cadence"
            value={cadence}
            onChange={(event) => setCadence(event.target.value)}
            className={inputClass}
          >
            <option value="once">Não repetir</option>
            <option value="weekly">Repetir toda semana</option>
            <option value="monthly">Repetir todo mês</option>
          </select>
        </Field>
        {cadence !== 'once' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Até esta data (opcional)" htmlFor="effectiveUntil">
              <input id="effectiveUntil" name="effectiveUntil" type="date" className={inputClass} />
            </Field>
            <Field label="Ou quantidade de vezes" htmlFor="maxOccurrences">
              <input
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
        <button
          type="button"
          onClick={() => router.replace('/app')}
          className={`${buttonClass} flex-1`}
        >
          Concluir
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-primary min-h-12 flex-1 rounded-xl px-4 font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Salvando…' : state.status === 'success' ? 'Adicionar outra' : 'Salvar'}
        </button>
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

const inputClass = 'border-border bg-background text-text min-h-12 w-full rounded-xl border px-3';
const buttonClass =
  'border-border bg-surface hover:bg-surface-elevated min-h-12 rounded-xl border px-4 text-center font-semibold transition-colors';
