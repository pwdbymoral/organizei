'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from '../actions/onboarding';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';

const initialState = { status: 'idle' as const, message: '' };

export function OnboardingForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(completeOnboarding, initialState);
  useEffect(() => {
    if (state.status === 'success') router.replace('/app');
  }, [router, state.status]);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <Label htmlFor="amount">Quanto existe hoje no caixa?</Label>
      <Input
        id="amount"
        name="amount"
        type="text"
        inputMode="decimal"
        placeholder="R$ 0,00"
        required
        autoFocus
      />
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Como usar esse valor?</legend>
        <label className="border-border bg-background grid gap-1 rounded-2xl border p-4 text-sm">
          <span className="flex items-start gap-3">
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
                As transações realizadas que você cadastrar, inclusive antigas, entram no saldo.
              </span>
            </span>
          </span>
        </label>
        <label className="border-border bg-background grid gap-1 rounded-2xl border p-4 text-sm">
          <span className="flex items-start gap-3">
            <input type="radio" name="balanceMode" value="confirmed_checkpoint" className="mt-1" />
            <span>
              <span className="font-medium">Este é meu saldo real agora</span>
              <span className="text-text-muted mt-1 block text-xs">
                Transações anteriores a esta conferência não serão somadas novamente.
              </span>
            </span>
          </span>
        </label>
      </fieldset>
      <div className="border-border bg-background rounded-2xl border p-4">
        <label className="flex items-start gap-3 text-sm" htmlFor="registrationReminder">
          <Checkbox id="registrationReminder" name="registrationReminder" defaultChecked />
          <span>
            <span className="font-medium">Lembrar de registrar movimentações</span>
            <span className="text-text-muted mt-1 block text-xs">
              Você poderá desligar ou trocar o horário em Configurações.
            </span>
          </span>
        </label>
        <label
          className="text-text-muted mt-3 grid gap-1 text-xs"
          htmlFor="registrationReminderTime"
        >
          Horário do lembrete
          <Input
            id="registrationReminderTime"
            name="registrationReminderTime"
            type="time"
            defaultValue="20:00"
          />
        </label>
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
      <Button type="submit" disabled={pending} className="min-h-12">
        {pending ? 'Configurando…' : 'Começar a organizar'}
      </Button>
    </form>
  );
}
