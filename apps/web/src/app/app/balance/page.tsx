import { eq } from 'drizzle-orm';
import { familyMembership } from '@organizei/database';
import { auth } from '../../../lib/auth';
import { createBalanceAdjustment } from '../../../actions/financial';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppNavigation } from '../../../components/app-navigation';
import { AppPageHeader } from '../../../components/app-page-header';
import { getDashboardData } from '../../../lib/dashboard-data';
import { toCivilDate } from '@organizei/domain';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export default async function BalancePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  const { db } = await import('@organizei/database');
  const membership = await db.query.familyMembership.findFirst({
    where: eq(familyMembership.userId, session.user.id),
  });
  if (!membership) redirect('/app');
  const data = await getDashboardData(membership.spaceId, session.user.id);
  if (!data.lastBalance) redirect('/onboarding');
  async function save(formData: FormData) {
    'use server';
    const amount = Number(String(formData.get('amount')).replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) return;
    await createBalanceAdjustment(
      membership!.spaceId,
      Math.round(amount * 100),
      toCivilDate(new Date(), 'America/Maceio'),
    );
    redirect('/app');
  }
  return (
    <main className="bg-background text-text min-h-screen px-4 py-8 pb-28 sm:pb-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AppNavigation />
        <div className="max-w-xl">
          <AppPageHeader
            title="Saldo"
            description="Confira o caixa quando o valor do app e o valor real não coincidirem."
            context="Ajuste do caixa"
          />
          <Card className="mt-5">
            <CardHeader>
              <CardTitle>Corrigir saldo atual</CardTitle>
              <CardDescription>
                Isso cria uma transação de ajuste e atualiza as previsões sem apagar suas
                transações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="bg-muted rounded-xl p-3 text-sm">
                Saldo calculado agora:{' '}
                <strong>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    data.cashSummary.currentBalanceCents / 100,
                  )}
                </strong>
                . O app registra somente a diferença.
              </p>
              <form action={save} className="grid gap-4">
                <Label htmlFor="amount">Saldo real agora</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  required
                />
                <Button className="min-h-12">Registrar ajuste</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
