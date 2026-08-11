import { Download, Info, Wallet, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '../../../lib/auth';
import { getUserPreferences } from '../../../actions/preferences';
import { AppNavigation } from '../../../components/app-navigation';
import { LogoutButton } from '../../../components/logout-button';
import { NotificationPreferences } from '../../../components/notification-preferences';
import { AppPageHeader } from '../../../components/app-page-header';
import { db, familyMembership } from '@organizei/database';
import { eq } from 'drizzle-orm';
import { ClearWorkspaceForm } from '../../../components/clear-workspace-form';

export default async function MorePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const preferences = await getUserPreferences();
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');
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
            <Wallet aria-hidden="true" className="size-4" /> Saldo
          </h2>
          <p className="text-text-muted mt-2 text-sm">
            Quando o saldo calculado não coincidir com o caixa real, registre uma conferência sem
            apagar o histórico.
          </p>
          <Link
            href="/app/balance"
            className="text-primary mt-4 inline-flex min-h-11 items-center font-semibold"
          >
            Ajustar saldo
          </Link>
        </section>
        <section className="border-border bg-surface rounded-3xl border p-5 sm:p-7">
          <h2 className="text-danger flex items-center gap-2 font-semibold">
            <Trash2 aria-hidden="true" className="size-4" /> Zona de limpeza
          </h2>
          <p className="text-text-muted mt-2 text-sm">
            Use ao recomeçar o planejamento. Esta ação é permanente e remove todo o estado
            financeiro deste workspace.
          </p>
          <div className="mt-4">
            <ClearWorkspaceForm spaceId={membership.spaceId} />
          </div>
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
