'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { completeBalanceRecalibration } from '../actions/onboarding';
import { Button } from './ui/button';

const initialState = { status: 'idle' as const, message: '' };

export function BalanceModeForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(completeBalanceRecalibration, initialState);

  useEffect(() => {
    if (state.status === 'success') router.replace('/app');
  }, [router, state.status]);

  return (
    <form action={action} className="grid gap-4">
      <label className="border-border bg-background flex items-start gap-3 rounded-2xl border p-4 text-sm">
        <input
          type="radio"
          name="balanceMode"
          value="reconstruct_history"
          defaultChecked
          className="mt-1"
        />
        <span>
          <span className="font-medium">Reconstruir meu histórico</span>
          <span className="text-text-muted mt-1 block text-xs">
            Inclui transações realizadas antigas no saldo atual.
          </span>
        </span>
      </label>
      <label className="border-border bg-background flex items-start gap-3 rounded-2xl border p-4 text-sm">
        <input type="radio" name="balanceMode" value="confirmed_checkpoint" className="mt-1" />
        <span>
          <span className="font-medium">Manter este saldo como checkpoint</span>
          <span className="text-text-muted mt-1 block text-xs">
            Só entram eventos realizados depois da última conferência.
          </span>
        </span>
      </label>
      {state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="text-sm"
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="min-h-12">
        {pending ? 'Salvando…' : 'Continuar'}
      </Button>
    </form>
  );
}
