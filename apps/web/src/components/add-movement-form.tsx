'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createFinancialMovementFormAction } from '../actions/financial';

const initialFinancialFormState = { status: 'idle' as const, message: '' };

export function AddMovementForm({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createFinancialMovementFormAction,
    initialFinancialFormState,
  );
  useEffect(() => {
    if (state.status === 'success') router.replace('/app');
  }, [router, state.status]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="spaceId" value={spaceId} />
      <Field label="Repetição" htmlFor="cadence">
        <select id="cadence" name="cadence" defaultValue="once" className={inputClass}>
          <option value="once">Não repetir</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
        </select>
      </Field>
      <Field label="Data final (opcional)" htmlFor="effectiveUntil">
        <input id="effectiveUntil" name="effectiveUntil" type="date" className={inputClass} />
      </Field>
      <p className="text-text-muted -mt-3 text-xs">
        Use uma data final ou quantidade para parcelar.
      </p>
      <Field label="Quantidade de ocorrências (opcional)" htmlFor="maxOccurrences">
        <input
          id="maxOccurrences"
          name="maxOccurrences"
          type="number"
          min="1"
          inputMode="numeric"
          className={inputClass}
        />
      </Field>
      <Field label="Descrição" htmlFor="description">
        <input
          id="description"
          name="description"
          required
          maxLength={160}
          className={inputClass}
        />
      </Field>
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
          required
          className={inputClass}
        />
      </Field>
      <Field label="Data planejada" htmlFor="plannedDate">
        <input id="plannedDate" name="plannedDate" type="date" required className={inputClass} />
      </Field>
      {state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="text-sm"
        >
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3 pt-4">
        <button type="button" onClick={() => router.back()} className={`${buttonClass} flex-1`}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-primary min-h-11 flex-1 rounded-md py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Salvar'}
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
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = 'border-border bg-surface text-text w-full min-h-11 rounded-md border p-2';
const buttonClass =
  'border-border hover:bg-surface-elevated min-h-11 rounded-md border py-2 text-center transition-colors';
