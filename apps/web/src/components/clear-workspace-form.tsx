'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearFinancialWorkspaceFormAction, type FinancialFormState } from '../actions/financial';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ConfirmSubmitButton } from './confirm-submit-button';

const initialState: FinancialFormState = { status: 'idle', message: '' };

export function ClearWorkspaceForm({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(clearFinancialWorkspaceFormAction, initialState);

  useEffect(() => {
    if (state.status === 'success') router.replace('/onboarding');
  }, [router, state.status]);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="spaceId" value={spaceId} />
      <p className="text-text-muted text-sm">
        Remove todas as transações, pagamentos, recorrências, ajustes, saldos e registros
        financeiros. Usuários e preferências permanecem.
      </p>
      <Label htmlFor="clearConfirmation">Digite LIMPAR WORKSPACE para confirmar</Label>
      <Input id="clearConfirmation" name="confirmation" autoComplete="off" required />
      {state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="text-sm"
        >
          {state.message}
        </p>
      )}
      <ConfirmSubmitButton
        title="Limpar workspace permanentemente?"
        message="Todas as transações, pagamentos, recorrências, ajustes, saldos e registros financeiros serão removidos."
        confirmLabel="Limpar workspace"
        className="bg-danger text-danger-foreground hover:bg-danger/90 inline-flex min-h-12 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
      >
        {pending ? 'Limpando…' : 'Limpar workspace'}
      </ConfirmSubmitButton>
    </form>
  );
}
