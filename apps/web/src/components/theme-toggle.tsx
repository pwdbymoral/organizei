'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

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
    <div aria-describedby="theme-description">
      <span id="theme-description" className="sr-only">
        Escolha entre tema claro, escuro ou seguir o sistema
      </span>
      <ToggleGroup
        type="single"
        value={theme ?? 'system'}
        onValueChange={(value) => {
          if (value) setTheme(value);
        }}
        variant="outline"
        aria-label="Tema"
        disabled={!mounted}
      >
        {themes.map(({ value, label, Icon }) => (
          <ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
            <Icon aria-hidden="true" className="size-4" strokeWidth={2} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
