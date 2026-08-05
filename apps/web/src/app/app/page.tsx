import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-6">
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <p className="font-semibold">Organizei</p>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <section aria-labelledby="foundation-title" className="py-16">
        <h1 id="foundation-title" className="text-2xl font-semibold">
          A fundação do Organizei está pronta.
        </h1>
        <p className="text-text-muted mt-3 max-w-prose">
          As funcionalidades financeiras serão implementadas nas próximas etapas.
        </p>
      </section>
    </main>
  );
}
