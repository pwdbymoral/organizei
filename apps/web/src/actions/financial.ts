'use server';

import { auth } from '../lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  type MovementInput,
  type MovementUpdate,
  type RecurrenceInput,
  createBalanceAdjustmentCore,
  createMovementCore,
  deleteMovementCore,
  deleteRecurrenceFromHereCore,
  deleteRecurrenceOccurrenceCore,
  createRecurrenceCore,
  materializeRecurrenceCore,
  materializeSpaceRecurrencesCore,
  recordPaymentCore,
  splitRecurrenceFromHereCore,
  updateRecurrenceCore,
  undoRealizationCore,
  updateMovementCore,
  clearFinancialWorkspaceCore,
  importFinancialCsvCore,
  createOpeningBalanceCore,
} from '../lib/financial-core';
import { toCivilDate } from '@organizei/domain';

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error('Unauthorized');
  return session.user;
}

export async function confirmBalance(
  spaceId: string,
  amountCents: number,
) {
  const user = await requireAuth();
  return createOpeningBalanceCore(spaceId, amountCents, user.id);
}

export async function createBalanceAdjustment(
  spaceId: string,
  targetAmountCents: number,
  today: string,
) {
  const user = await requireAuth();
  return createBalanceAdjustmentCore(spaceId, targetAmountCents, today, user.id);
}

export async function createMovement(spaceId: string, data: MovementInput) {
  const user = await requireAuth();
  return createMovementCore(spaceId, data, user.id);
}

export async function updateMovement(
  spaceId: string,
  movementId: string,
  data: MovementUpdate,
  version: number,
) {
  const user = await requireAuth();
  return updateMovementCore(spaceId, movementId, data, version, user.id);
}

export async function deleteMovement(spaceId: string, movementId: string, version: number) {
  const user = await requireAuth();
  return deleteMovementCore(spaceId, movementId, version, user.id);
}

export async function deleteRecurrenceFromHere(
  spaceId: string,
  ruleId: string,
  effectiveFrom: string,
) {
  const user = await requireAuth();
  return deleteRecurrenceFromHereCore(spaceId, ruleId, effectiveFrom, user.id);
}

export async function deleteRecurrenceOccurrence(
  spaceId: string,
  ruleId: string,
  effectiveFrom: string,
) {
  const user = await requireAuth();
  return deleteRecurrenceOccurrenceCore(spaceId, ruleId, effectiveFrom, user.id);
}

export async function createRecurrence(spaceId: string, data: RecurrenceInput) {
  const user = await requireAuth();
  return createRecurrenceCore(spaceId, data, user.id);
}

export async function materializeRecurrence(spaceId: string, ruleId: string, horizonEnd: string) {
  const user = await requireAuth();
  return materializeRecurrenceCore(spaceId, ruleId, horizonEnd, user.id);
}

export async function ensureRecurrenceHorizon(spaceId: string, horizonEnd: string) {
  const user = await requireAuth();
  return materializeSpaceRecurrencesCore(spaceId, horizonEnd, user.id);
}

export async function recordPayment(
  spaceId: string,
  movementId: string,
  amountCents: number,
  paidDate: string,
  version: number,
) {
  const user = await requireAuth();
  return recordPaymentCore(spaceId, movementId, amountCents, paidDate, version, user.id);
}

export async function undoRealization(spaceId: string, movementId: string, version: number) {
  const user = await requireAuth();
  return undoRealizationCore(spaceId, movementId, version, user.id);
}

export async function clearFinancialWorkspace(spaceId: string, confirmation: string) {
  const user = await requireAuth();
  if (confirmation !== 'LIMPAR WORKSPACE') throw new Error('Confirmação inválida.');
  return clearFinancialWorkspaceCore(spaceId, user.id);
}

export async function clearFinancialWorkspaceFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    await clearFinancialWorkspace(
      String(formData.get('spaceId')),
      String(formData.get('confirmation')),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    revalidatePath('/app/more');
    return { status: 'success', message: 'Workspace limpo.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function importFinancialCsvFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo CSV.');
    if (file.size > 2_000_000) throw new Error('O arquivo CSV deve ter no máximo 2 MB.');
    await importFinancialCsvCore(
      String(formData.get('spaceId')),
      await file.text(),
      (await requireAuth()).id,
      toCivilDate(new Date(), 'America/Maceio'),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    return { status: 'success', message: 'CSV importado com sucesso.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function splitRecurrenceFromHere(
  spaceId: string,
  ruleId: string,
  effectiveFrom: string,
  changes: Parameters<typeof splitRecurrenceFromHereCore>[3],
) {
  const user = await requireAuth();
  return splitRecurrenceFromHereCore(spaceId, ruleId, effectiveFrom, changes, user.id);
}

export type FinancialFormState = { status: 'idle' | 'success' | 'error'; message: string };

function userFacingError(error: unknown): FinancialFormState {
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a ação.';
  const safeMessages = [
    'Conflict',
    'Movimentação já finalizada.',
    'Pagamento excede o saldo restante.',
    'Não é possível excluir uma movimentação realizada.',
    'Não é possível excluir uma movimentação com pagamentos.',
    'Não é possível excluir uma série com pagamentos parciais.',
    'Não é possível alterar uma série com pagamentos parciais futuros.',
    'A ocorrência realizada não possui próximas ocorrências para editar.',
    'Data do pagamento não pode ser futura.',
    'Descrição inválida.',
    'Valor previsto deve ser um valor positivo em centavos.',
    'Uma transação realizada não pode ter data futura.',
    'O valor realizado deve corresponder ao total pago.',
    'A nova data deve manter a ordem das ocorrências.',
    'A ocorrência deve pertencer ao futuro da série.',
  ];
  return {
    status: 'error',
    message: safeMessages.includes(message)
      ? message === 'Conflict'
        ? 'Esta movimentação foi alterada por outra pessoa. Atualize a página e tente novamente.'
        : message
      : 'Não foi possível concluir a ação. Revise os dados e tente novamente.',
  };
}

function readMoneyCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Informe um valor válido.');
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents) || cents < 1)
    throw new Error('Informe um valor maior que zero.');
  return cents;
}

export async function updateOccurrenceFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    await updateMovement(
      String(formData.get('spaceId')),
      String(formData.get('movementId')),
      {
        description: String(formData.get('description')),
        direction: String(formData.get('direction')) as MovementInput['direction'],
        expectedAmountCents: readMoneyCents(formData.get('amount')),
        ...(formData.get('plannedDate')
          ? { plannedDate: String(formData.get('plannedDate')) }
          : {}),
        ...(formData.get('realizedDate')
          ? { realizedDate: String(formData.get('realizedDate')) }
          : {}),
      },
      Number(formData.get('version')),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    return { status: 'success', message: 'Ocorrência atualizada.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function deleteMovementFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    await deleteMovement(
      String(formData.get('spaceId')),
      String(formData.get('movementId')),
      Number(formData.get('version')),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    return { status: 'success', message: 'Transação excluída.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function deleteRecurrenceFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    await deleteRecurrenceFromHere(
      String(formData.get('spaceId')),
      String(formData.get('ruleId')),
      String(formData.get('effectiveFrom')),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    return { status: 'success', message: 'Próximas ocorrências excluídas.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function deleteRecurrenceOccurrenceFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    await deleteRecurrenceOccurrence(
      String(formData.get('spaceId')),
      String(formData.get('ruleId')),
      String(formData.get('effectiveFrom')),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    return { status: 'success', message: 'Transação excluída.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function splitRecurrenceFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const effectiveFrom = String(formData.get('effectiveFrom'));
    const firstOccurrenceDate = String(formData.get('firstOccurrenceDate') ?? '').trim();
    const endDate = String(formData.get('effectiveUntil') ?? '').trim();
    const count = String(formData.get('maxOccurrences') ?? '').trim();
    const cadence = String(formData.get('cadence') ?? '');
    const changes = {
      description: String(formData.get('description')),
      direction: String(formData.get('direction')) as MovementInput['direction'],
      expectedAmountCents: readMoneyCents(formData.get('amount')),
      ...(cadence === 'weekly' || cadence === 'monthly'
        ? { cadence: cadence as RecurrenceInput['cadence'] }
        : {}),
      effectiveUntil: endDate || null,
      maxOccurrences: count ? Number.parseInt(count, 10) : null,
      ...(firstOccurrenceDate ? { firstOccurrenceDate } : {}),
    };
    const changesDate = firstOccurrenceDate || effectiveFrom;
    const rule =
      String(formData.get('scope')) === 'all' && changesDate === effectiveFrom
        ? await updateRecurrenceCore(
            String(formData.get('spaceId')),
            String(formData.get('ruleId')),
            changes,
            (await requireAuth()).id,
          )
        : await splitRecurrenceFromHere(
            String(formData.get('spaceId')),
            String(formData.get('ruleId')),
            effectiveFrom,
            changes,
          );
    const horizon = new Date(`${changesDate}T00:00:00Z`);
    horizon.setUTCFullYear(horizon.getUTCFullYear() + 1);
    await materializeRecurrence(
      String(formData.get('spaceId')),
      rule.id,
      horizon.toISOString().slice(0, 10),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    return { status: 'success', message: 'Próximas ocorrências atualizadas.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function recordPaymentFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    await recordPayment(
      String(formData.get('spaceId')),
      String(formData.get('movementId')),
      readMoneyCents(formData.get('amount')),
      String(formData.get('paidDate')),
      Number(formData.get('version')),
    );
    revalidatePath('/app');
    revalidatePath('/app/movements');
    return { status: 'success', message: 'Pagamento registrado.' };
  } catch (error) {
    return userFacingError(error);
  }
}

export async function createFinancialMovementFormAction(
  _previous: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const spaceId = String(formData.get('spaceId'));
    const cadence = String(formData.get('cadence'));
    const plannedDate = String(formData.get('plannedDate'));
    const movement: MovementInput = {
      description: String(formData.get('description')),
      direction: String(formData.get('direction')) as MovementInput['direction'],
      expectedAmountCents: readMoneyCents(formData.get('amount')),
      plannedDate,
      initialStatus: String(formData.get('initialStatus')) === 'realized' ? 'realized' : 'pending',
    };
    if (cadence === 'once') {
      await createMovement(spaceId, movement);
    } else if (cadence === 'weekly' || cadence === 'monthly') {
      const endDate = String(formData.get('effectiveUntil') ?? '').trim();
      const count = String(formData.get('maxOccurrences') ?? '').trim();
      const rule = await createRecurrence(spaceId, {
        ...movement,
        cadence,
        effectiveFrom: plannedDate,
        effectiveUntil: endDate || null,
        maxOccurrences: count ? Number.parseInt(count, 10) : null,
      });
      const horizon = new Date(`${plannedDate}T00:00:00Z`);
      horizon.setUTCFullYear(horizon.getUTCFullYear() + 1);
      await materializeRecurrence(spaceId, rule.id, horizon.toISOString().slice(0, 10));
    } else {
      throw new Error('Repetição inválida.');
    }
    revalidatePath('/app');
    return { status: 'success', message: 'Movimentação salva.' };
  } catch (error) {
    return userFacingError(error);
  }
}
