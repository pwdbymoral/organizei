'use client';

import { Bell, Check, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useTheme } from 'next-themes';
import { saveUserPreferences, type UserPreferences } from '../actions/preferences';
import { ThemeToggle } from './theme-toggle';

export function NotificationPreferences({ initial }: { initial: UserPreferences }) {
  const { theme, setTheme } = useTheme();
  const appliedInitialTheme = useRef(false);
  useEffect(() => {
    if (!appliedInitialTheme.current && theme) {
      appliedInitialTheme.current = true;
      if (theme !== initial.theme) setTheme(initial.theme);
    }
  }, [initial.theme, setTheme, theme]);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'unknown'>(
    'unknown',
  );
  const [subscriptionState, setSubscriptionState] = useState<'unknown' | 'subscribed' | 'inactive'>(
    'unknown',
  );
  useEffect(() => {
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPermission('unsupported');
      setSubscriptionState('inactive');
      return;
    }
    setPermission(Notification.permission);
    void navigator.serviceWorker.ready.then(async (registration) => {
      setSubscriptionState(
        (await registration.pushManager.getSubscription()) ? 'subscribed' : 'inactive',
      );
    });
  }, []);

  async function requestPermission() {
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPermission('unsupported');
      return;
    }
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== 'granted') return;
    const keyResponse = await fetch('/api/notifications/vapid-public-key');
    if (!keyResponse.ok) return setSubscriptionState('inactive');
    const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
    if (!publicKey) return setSubscriptionState('inactive');
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...subscription.toJSON(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent,
      }),
    });
    setSubscriptionState(response.ok ? 'subscribed' : 'inactive');
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await saveUserPreferences(formData);
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2200);
        });
      }}
      className="grid gap-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Aparência</h2>
          <p className="text-text-muted mt-1 text-sm">
            Escolha como o Organizei aparece para você.
          </p>
        </div>
        <ThemeToggle />
      </div>
      <input type="hidden" name="theme" value={theme ?? initial.theme} />

      <div className="border-border border-t pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Bell aria-hidden="true" className="size-4" /> Alertas
            </h2>
            <p className="text-text-muted mt-1 text-sm">Escolha os avisos úteis para sua rotina.</p>
          </div>
          <button
            type="button"
            onClick={requestPermission}
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            {subscriptionState === 'subscribed'
              ? 'Alertas ativos neste dispositivo'
              : permission === 'granted'
                ? 'Ativar alertas neste dispositivo'
                : permission === 'denied'
                  ? 'Permissão bloqueada'
                  : 'Permitir no navegador'}
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {[
            [
              'registrationReminder',
              'Lembrar de registrar movimentações',
              'Ajuda a manter o caixa atualizado no fim do dia.',
            ],
            ['dailySummary', 'Resumo diário', 'Uma visão rápida do que merece atenção.'],
            ['balanceAlerts', 'Saldo baixo', 'Aviso quando a previsão exigir uma decisão.'],
            [
              'dueReminders',
              'Vencimentos próximos',
              'Lembrete de movimentações que estão chegando.',
            ],
          ].map(([name, label, description]) => (
            <label
              key={name}
              className="border-border hover:bg-surface-elevated flex cursor-pointer items-center gap-3 rounded-xl border p-3"
            >
              <input
                name={name}
                type="checkbox"
                defaultChecked={initial[name as keyof UserPreferences] as boolean}
                role="switch"
                className="border-border bg-background checked:bg-primary relative mt-0.5 h-6 w-10 shrink-0 appearance-none rounded-full border transition-colors before:absolute before:left-1 before:top-1 before:size-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
              />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-text-muted block text-xs">{description}</span>
              </span>
            </label>
          ))}
        </div>
        <label
          className="text-text-muted mt-4 grid max-w-xs gap-1 text-xs"
          htmlFor="registrationReminderTime"
        >
          Horário do lembrete diário
          <input
            id="registrationReminderTime"
            name="registrationReminderTime"
            type="time"
            defaultValue={initial.registrationReminderTime}
            className="border-border bg-background text-text min-h-11 rounded-xl border px-3 text-sm"
          />
        </label>
        <input type="hidden" name="timezone" value={initial.timezone} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-semibold text-white disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : saved ? (
          <Check aria-hidden="true" className="size-4" />
        ) : null}
        {isPending ? 'Salvando…' : saved ? 'Preferências salvas' : 'Salvar preferências'}
      </button>
    </form>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
