import { Download, Info } from 'lucide-react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '../../../lib/auth';
import { getUserPreferences } from '../../../actions/preferences';
import { AppNavigation } from '../../../components/app-navigation';
import { LogoutButton } from '../../../components/logout-button';
import { NotificationPreferences } from '../../../components/notification-preferences';
import { AppPageHeader } from '../../../components/app-page-header';

export default async function MorePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const preferences = await getUserPreferences();
  return (
    <main className="bg-background text-text min-h-screen px-4 py-6 pb-28 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AppPageHeader
          title="Configurações"
          description="Preferências para deixar o app do seu jeito e facilitar o uso no dia a dia."
          context="Configurações pessoais"
        />
        <AppNavigation />
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-7">
          <NotificationPreferences initial={preferences} />
        </section>
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-7">
          <h2 className="flex items-center gap-2 font-semibold">
            <Download aria-hidden="true" className="size-4" /> Usar como aplicativo
          </h2>
          <p className="text-text-muted mt-2 text-sm">
            Instale o Organizei pelo menu do navegador para abrir em uma janela própria. O app
            funciona offline apenas para a tela de conexão; seus dados financeiros nunca ficam
            expostos no cache.
          </p>
          <p className="text-text-muted mt-3 text-sm">
            Se o navegador oferecer “Adicionar à tela inicial” ou “Instalar”, você pode aceitar com
            segurança.
          </p>
        </section>
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-7">
          <h2 className="flex items-center gap-2 font-semibold">
            <Info aria-hidden="true" className="size-4" /> Conta
          </h2>
          <p className="text-text-muted mt-2 text-sm">
            Sessão ativa para <span className="text-text font-medium">{session.user.email}</span>.
          </p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
