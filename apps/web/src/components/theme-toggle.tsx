'use client';
import { useTheme } from 'next-themes';
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="text-text-muted text-sm">
      Tema{' '}
      <select
        aria-label="Tema"
        className="bg-surface text-text ml-2 rounded border p-2"
        value={theme}
        onChange={(event) => setTheme(event.target.value)}
      >
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
        <option value="system">Sistema</option>
      </select>
    </label>
  );
}
