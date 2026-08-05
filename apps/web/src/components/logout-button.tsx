'use client';
export function LogoutButton() {
  return (
    <button
      className="rounded border px-3 py-2 text-sm"
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
      Sair
    </button>
  );
}
