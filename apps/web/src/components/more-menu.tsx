'use client';

import { MoreHorizontal, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { LogoutButton } from './logout-button';

export function MoreMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="text-text-muted hover:bg-surface-elevated hover:text-text flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
        <span>Mais</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Mais opções"
          className="border-border bg-surface absolute right-0 top-12 z-30 w-64 rounded-2xl border p-2 shadow-xl"
        >
          <p className="text-text-muted flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
            <Settings2 aria-hidden="true" className="size-3.5" /> Preferências
          </p>
          <div className="border-border my-1 border-t" />
          <div className="flex items-center justify-between rounded-xl px-3 py-2">
            <span className="text-sm">Tema</span>
            <ThemeToggle />
          </div>
          <div className="border-border my-1 border-t" />
          <div className="px-1">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
