'use client';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(form: FormData) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (response.ok) window.location.assign('/app');
      else throw new Error('invalid-credentials');
    } catch {
      setError('Não foi possível entrar. Verifique suas credenciais.');
      setPending(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Organizei</p>
        <ThemeToggle />
      </div>
      <section aria-labelledby="login-title" className="bg-surface rounded-lg border p-6">
        <h1 id="login-title" className="text-2xl font-semibold">
          Entrar
        </h1>
        <p className="text-text-muted mt-2">Use suas credenciais individuais.</p>
        <form action={submit} className="mt-6 grid gap-4">
          <label>
            E-mail
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="bg-background mt-1 w-full rounded border p-3"
            />
          </label>
          <label>
            Senha
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              className="bg-background mt-1 w-full rounded border p-3"
            />
          </label>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <button
            disabled={pending}
            className="bg-primary min-h-12 rounded p-3 font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
