'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <label className="text-text-muted text-sm">
      Tema{' '}
      <select
        aria-label="Tema"
        className="bg-surface text-text ml-2 rounded border p-2"
        disabled={!mounted}
        value={theme ?? 'system'}
        onChange={(event) => setTheme(event.target.value)}
      >
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
        <option value="system">Sistema</option>
      </select>
    </label>
  );
}
