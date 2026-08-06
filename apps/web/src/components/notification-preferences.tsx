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
  useEffect(() => {
    setPermission('Notification' in window ? Notification.permission : 'unsupported');
  }, []);

  function requestPermission() {
    if (!('Notification' in window)) return setPermission('unsupported');
    void Notification.requestPermission().then(setPermission);
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
            {permission === 'granted'
              ? 'Permitidas neste dispositivo'
              : permission === 'denied'
                ? 'Permissão bloqueada'
                : 'Permitir no navegador'}
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {[
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
                className="size-4 accent-[--color-primary]"
              />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-text-muted block text-xs">{description}</span>
              </span>
            </label>
          ))}
        </div>
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
