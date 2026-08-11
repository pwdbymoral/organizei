'use client';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <Card>
        <CardHeader>
          <h1 id="login-title" className="font-heading text-base font-medium leading-snug">
            Entrar
          </h1>
          <CardDescription>Use suas credenciais individuais.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submit} className="mt-6 grid gap-4">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" required name="email" type="email" autoComplete="email" />
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              required
              name="password"
              type="password"
              autoComplete="current-password"
            />
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
            <Button disabled={pending} className="min-h-12">
              {pending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
