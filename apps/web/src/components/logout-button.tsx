'use client';
import { LogOut } from 'lucide-react';
export function LogoutButton() {
  return (
    <button
      type="button"
      className="text-text-muted hover:bg-surface-elevated hover:text-text inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
      aria-label="Sair"
      title="Sair"
      onClick={async () => {
        await fetch('/api/auth/sign-out', { method: 'POST' });
        localStorage.clear();
        sessionStorage.clear();
        await Promise.all(
          (await caches.keys())
            .filter((name) => name.startsWith('organizei-') && name !== 'organizei-public-shell-v1')
            .map((name) => caches.delete(name)),
        );
        window.location.assign('/login');
      }}
    >
      <LogOut aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
