'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useActionState, useEffect, useState } from 'react';
import { splitRecurrenceFormAction, updateOccurrenceFormAction } from '../actions/financial';

const initialFinancialFormState = { status: 'idle' as const, message: '' };

type MovementDialogProps = {
  spaceId: string;
  movement: {
    id: string;
    recurrenceRuleVersionId: string | null;
    cadence: 'weekly' | 'monthly' | null;
    version: number;
    description: string;
    direction: 'income' | 'expense';
    expectedAmountCents: number;
    plannedDate: string;
  };
};

const inputClass =
  'border-border bg-background text-text w-full rounded-md border px-3 py-2 text-sm';
const buttonClass =
  'border-border bg-background text-text min-h-11 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-surface-elevated';

function FormFeedback({
  message,
  status,
}: {
  message: string;
  status: 'idle' | 'success' | 'error';
}) {
  if (!message) return null;
  return (
    <p role={status === 'error' ? 'alert' : 'status'} aria-live="polite" className="text-sm">
      {message}
    </p>
  );
}

export function FinancialMovementDialogs({ spaceId, movement }: MovementDialogProps) {
  const [occurrenceOpen, setOccurrenceOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [occurrenceState, occurrenceAction, occurrencePending] = useActionState(
    updateOccurrenceFormAction,
    initialFinancialFormState,
  );
  const [seriesState, seriesAction, seriesPending] = useActionState(
    splitRecurrenceFormAction,
    initialFinancialFormState,
  );

  useEffect(() => {
    if (occurrenceState.status === 'success') setOccurrenceOpen(false);
  }, [occurrenceState.status]);
  useEffect(() => {
    if (seriesState.status === 'success') setSeriesOpen(false);
  }, [seriesState.status]);

  return (
    <>
      <Dialog.Root open={occurrenceOpen} onOpenChange={setOccurrenceOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className={buttonClass}>
            Editar esta
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="bg-text/35 fixed inset-0" />
          <Dialog.Content className="bg-surface text-text fixed inset-x-4 top-1/2 z-10 mx-auto max-h-[90vh] w-auto max-w-lg -translate-y-1/2 overflow-y-auto rounded-xl border p-5 shadow-xl sm:inset-x-0">
            <Dialog.Title className="text-lg font-semibold">Editar esta ocorrência</Dialog.Title>
            <Dialog.Description className="text-text-muted mt-1 text-sm">
              Esta mudança não altera as próximas ocorrências da série.
            </Dialog.Description>
            <form action={occurrenceAction} className="mt-5 space-y-4">
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="movementId" value={movement.id} />
              <input type="hidden" name="version" value={movement.version} />
              <MovementFields movement={movement} />
              <FormFeedback {...occurrenceState} />
              <div className="flex flex-wrap justify-end gap-2">
                <Dialog.Close asChild>
                  <button type="button" className={buttonClass}>
                    Voltar
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={occurrencePending}
                  className="bg-primary min-h-11 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {occurrencePending ? 'Salvando…' : 'Salvar ocorrência'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {movement.recurrenceRuleVersionId && (
        <Dialog.Root open={seriesOpen} onOpenChange={setSeriesOpen}>
          <Dialog.Trigger asChild>
            <button type="button" className={buttonClass}>
              Editar próximas
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="bg-text/35 fixed inset-0" />
            <Dialog.Content className="bg-surface text-text fixed inset-x-4 top-1/2 z-10 mx-auto max-h-[90vh] w-auto max-w-lg -translate-y-1/2 overflow-y-auto rounded-xl border p-5 shadow-xl sm:inset-x-0">
              <Dialog.Title className="text-lg font-semibold">
                Editar esta e as próximas
              </Dialog.Title>
              <Dialog.Description className="text-text-muted mt-1 text-sm">
                Ocorrências anteriores permanecem intactas.
              </Dialog.Description>
              <form action={seriesAction} className="mt-5 space-y-4">
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="ruleId" value={movement.recurrenceRuleVersionId} />
                <input type="hidden" name="effectiveFrom" value={movement.plannedDate} />
                <MovementFields movement={movement} includeCadence />
                <div>
                  <label htmlFor={`end-${movement.id}`} className="mb-1 block text-sm font-medium">
                    Data final (opcional)
                  </label>
                  <input
                    id={`end-${movement.id}`}
                    name="effectiveUntil"
                    type="date"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`count-${movement.id}`}
                    className="mb-1 block text-sm font-medium"
                  >
                    Ocorrências restantes (opcional)
                  </label>
                  <input
                    id={`count-${movement.id}`}
                    name="maxOccurrences"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    className={inputClass}
                  />
                </div>
                <FormFeedback {...seriesState} />
                <div className="flex flex-wrap justify-end gap-2">
                  <Dialog.Close asChild>
                    <button type="button" className={buttonClass}>
                      Voltar
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={seriesPending}
                    className="bg-primary min-h-11 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {seriesPending ? 'Salvando…' : 'Salvar próximas'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}

function MovementFields({
  movement,
  includeCadence = false,
}: Pick<MovementDialogProps, 'movement'> & { includeCadence?: boolean }) {
  return (
    <>
      <div>
        <label htmlFor={`description-${movement.id}`} className="mb-1 block text-sm font-medium">
          Descrição
        </label>
        <input
          id={`description-${movement.id}`}
          name="description"
          defaultValue={movement.description}
          required
          maxLength={160}
          className={inputClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`direction-${movement.id}`} className="mb-1 block text-sm font-medium">
            Tipo
          </label>
          <select
            id={`direction-${movement.id}`}
            name="direction"
            defaultValue={movement.direction}
            className={inputClass}
          >
            <option value="expense">Saída</option>
            <option value="income">Entrada</option>
          </select>
        </div>
        <div>
          <label htmlFor={`amount-${movement.id}`} className="mb-1 block text-sm font-medium">
            Valor (R$)
          </label>
          <input
            id={`amount-${movement.id}`}
            name="amount"
            type="text"
            inputMode="decimal"
            defaultValue={(movement.expectedAmountCents / 100).toFixed(2)}
            required
            className={inputClass}
          />
        </div>
      </div>
      {includeCadence ? (
        <div>
          <label htmlFor={`cadence-${movement.id}`} className="mb-1 block text-sm font-medium">
            Repetição
          </label>
          <select
            id={`cadence-${movement.id}`}
            name="cadence"
            defaultValue={movement.cadence ?? 'monthly'}
            className={inputClass}
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor={`date-${movement.id}`} className="mb-1 block text-sm font-medium">
            Data planejada
          </label>
          <input
            id={`date-${movement.id}`}
            name="plannedDate"
            type="date"
            defaultValue={movement.plannedDate}
            required
            className={inputClass}
          />
        </div>
      )}
    </>
  );
}
