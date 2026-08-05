'use client';
export function LogoutButton() {
  return (
    <button
      className="rounded border px-3 py-2 text-sm"
      onClick={async () => {
        await fetch('/api/auth/sign-out', { method: 'POST' });
        window.location.assign('/login');
      }}
    >
      Sair
    </button>
  );
}
