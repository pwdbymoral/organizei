'use client';

import { useActionState } from 'react';
import { recordPaymentFormAction } from '../actions/financial';

const initialFinancialFormState = { status: 'idle' as const, message: '' };

type FinancialPaymentFormProps = {
  spaceId: string;
  movementId: string;
  version: number;
  description: string;
  paidDate: string;
  remainingCents: number;
};

export function FinancialPaymentForm({
  spaceId,
  movementId,
  version,
  description,
  paidDate,
  remainingCents,
}: FinancialPaymentFormProps) {
  const [state, formAction, pending] = useActionState(
    recordPaymentFormAction,
    initialFinancialFormState,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="movementId" value={movementId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="paidDate" value={paidDate} />
      <input
        aria-label={`Valor pago para ${description}`}
        name="amount"
        type="text"
        inputMode="decimal"
        placeholder="R$"
        pattern="\d+([,.]\d{1,2})?"
        required
        className="border-border bg-background text-text min-h-11 w-24 rounded border px-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending || remainingCents < 1}
        className="border-border bg-background text-text hover:bg-surface-elevated min-h-11 rounded border px-3 text-xs font-semibold disabled:opacity-60"
      >
        {pending ? 'Registrando…' : 'Pagar'}
      </button>
      {state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="basis-full text-xs"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
