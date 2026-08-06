'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from '../actions/onboarding';

const initialState = { status: 'idle' as const, message: '' };

export function OnboardingForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(completeOnboarding, initialState);
  useEffect(() => {
    if (state.status === 'success') router.replace('/app');
  }, [router, state.status]);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <label className="grid gap-1 text-sm font-medium" htmlFor="amount">
        Quanto existe hoje no caixa?
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          placeholder="R$ 0,00"
          required
          autoFocus
          className="border-border bg-background min-h-12 rounded-xl border px-3 text-lg"
        />
      </label>
      <div className="border-border bg-background rounded-2xl border p-4">
        <label className="flex items-start gap-3 text-sm" htmlFor="registrationReminder">
          <input
            id="registrationReminder"
            name="registrationReminder"
            type="checkbox"
            defaultChecked
            className="mt-1 size-4 accent-[--color-primary]"
          />
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
          <input
            id="registrationReminderTime"
            name="registrationReminderTime"
            type="time"
            defaultValue="20:00"
            className="border-border bg-surface text-text min-h-11 rounded-xl border px-3 text-sm"
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
      <button
        type="submit"
        disabled={pending}
        className="bg-primary min-h-12 rounded-xl px-4 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Configurando…' : 'Começar a organizar'}
      </button>
    </form>
  );
}
