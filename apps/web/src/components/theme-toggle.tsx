'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Sun } from 'lucide-react';

const themes = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Laptop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div
      aria-label="Tema"
      aria-describedby="theme-description"
      role="group"
      className="border-border bg-surface inline-flex rounded-lg border p-1 shadow-sm"
    >
      <span id="theme-description" className="sr-only">
        Escolha entre tema claro, escuro ou seguir o sistema
      </span>
      {themes.map(({ value, label, Icon }) => {
        const selected = mounted && (theme ?? 'system') === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            title={label}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={`min-h-9 min-w-9 rounded-md px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] ${
              selected
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-elevated hover:text-text'
            }`}
          >
            <Icon aria-hidden="true" className="mx-auto size-4" strokeWidth={2} />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
