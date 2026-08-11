'use client';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';

export function LogoutButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
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
    </Button>
  );
}
