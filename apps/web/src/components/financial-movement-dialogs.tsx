'use client';

import { useActionState, useEffect, useState } from 'react';
import { splitRecurrenceFormAction, updateOccurrenceFormAction } from '../actions/financial';
import { ResponsiveFormSurface } from './responsive-form-surface';
import { Button } from './ui/button';
import { Field, FieldGroup, FieldLabel } from './ui/field';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
    realizedDate: string | null;
    status: 'pending' | 'realized';
  };
};

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
  const [surface, setSurface] = useState<'scope' | 'occurrence' | 'series' | null>(null);
  const [seriesScope, setSeriesScope] = useState<'future' | 'all'>('future');
  const [occurrenceState, occurrenceAction, occurrencePending] = useActionState(
    updateOccurrenceFormAction,
    initialFinancialFormState,
  );
  const [seriesState, seriesAction, seriesPending] = useActionState(
    splitRecurrenceFormAction,
    initialFinancialFormState,
  );

  useEffect(() => {
    if (occurrenceState.status === 'success' || seriesState.status === 'success') {
      setSurface(null);
    }
  }, [occurrenceState.status, seriesState.status]);

  const isOpen = surface !== null;
  const title =
    surface === 'scope'
      ? `O que deseja editar em ${movement.description}?`
      : surface === 'occurrence'
        ? 'Editar transação'
        : seriesScope === 'all'
          ? 'Editar todas as futuras'
          : 'Editar esta e as próximas';
  const description =
    surface === 'scope'
      ? 'Escolha quais ocorrências devem receber esta alteração.'
      : surface === 'occurrence'
        ? 'Ajuste os detalhes desta transação.'
        : 'Ocorrências já realizadas permanecem intactas.';

  return (
    <ResponsiveFormSurface
      open={isOpen}
      onOpenChange={(open) => setSurface(open ? 'scope' : null)}
      trigger={
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onPointerDown={(event) => event.preventDefault()}
        >
          Editar
        </Button>
      }
      title={title}
      description={description}
    >
      {surface === 'scope' && (
        <div className="grid gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full justify-start"
            onClick={() => {
              setSurface('occurrence');
            }}
          >
            Somente esta transação
          </Button>
          {movement.recurrenceRuleVersionId && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full justify-start"
              onClick={() => {
                setSeriesScope('future');
                setSurface('series');
              }}
            >
              Esta e as próximas
            </Button>
          )}
          {movement.recurrenceRuleVersionId && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full justify-start"
              onClick={() => {
                setSeriesScope('all');
                setSurface('series');
              }}
            >
              Todas as futuras ocorrências
            </Button>
          )}
        </div>
      )}
      {surface === 'occurrence' && (
        <form action={occurrenceAction} className="grid gap-5">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="movementId" value={movement.id} />
          <input type="hidden" name="version" value={movement.version} />
          <MovementFields movement={movement} />
          <FormFeedback {...occurrenceState} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSurface('scope')}>
              Voltar
            </Button>
            <Button type="submit" disabled={occurrencePending}>
              {occurrencePending ? 'Salvando…' : 'Salvar transação'}
            </Button>
          </div>
        </form>
      )}
      {surface === 'series' && movement.recurrenceRuleVersionId && (
        <form action={seriesAction} className="grid gap-5">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="ruleId" value={movement.recurrenceRuleVersionId} />
          <input type="hidden" name="effectiveFrom" value={movement.plannedDate} />
          <input type="hidden" name="scope" value={seriesScope} />
          <MovementFields movement={movement} includeCadence />
          <Field>
            <FieldLabel htmlFor={'end-' + movement.id}>Data final (opcional)</FieldLabel>
            <Input id={'end-' + movement.id} name="effectiveUntil" type="date" />
          </Field>
          <Field>
            <FieldLabel htmlFor={'count-' + movement.id}>
              Ocorrências restantes (opcional)
            </FieldLabel>
            <Input
              id={'count-' + movement.id}
              name="maxOccurrences"
              type="number"
              min="1"
              inputMode="numeric"
            />
          </Field>
          <FormFeedback {...seriesState} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSurface('scope')}>
              Voltar
            </Button>
            <Button type="submit" disabled={seriesPending}>
              {seriesPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      )}
    </ResponsiveFormSurface>
  );
}

function MovementFields({
  movement,
  includeCadence = false,
}: Pick<MovementDialogProps, 'movement'> & { includeCadence?: boolean }) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={'description-' + movement.id}>Descrição</FieldLabel>
        <Input
          id={'description-' + movement.id}
          name="description"
          defaultValue={movement.description}
          required
          maxLength={160}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={'direction-' + movement.id}>Tipo</FieldLabel>
          <Select name="direction" defaultValue={movement.direction}>
            <SelectTrigger id={'direction-' + movement.id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Saída</SelectItem>
              <SelectItem value="income">Entrada</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={'amount-' + movement.id}>Valor (R$)</FieldLabel>
          <Input
            id={'amount-' + movement.id}
            name="amount"
            type="text"
            inputMode="decimal"
            defaultValue={(movement.expectedAmountCents / 100).toFixed(2)}
            required
          />
        </Field>
      </div>
      {includeCadence ? (
        <>
          <Field>
            <FieldLabel htmlFor={'first-date-' + movement.id}>Primeira ocorrência em</FieldLabel>
            <Input
              id={'first-date-' + movement.id}
              name="firstOccurrenceDate"
              type="date"
              defaultValue={movement.plannedDate}
              disabled={movement.status === 'realized'}
              required
            />
            {movement.status === 'realized' && (
              <input type="hidden" name="firstOccurrenceDate" value={movement.plannedDate} />
            )}
            <p className="text-text-muted text-xs">
              {movement.status === 'realized'
                ? 'Abra uma ocorrência pendente para alterar a data da série.'
                : 'As próximas ocorrências seguirão o mesmo intervalo a partir desta data.'}
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor={'cadence-' + movement.id}>Repetição</FieldLabel>
            <Select name="cadence" defaultValue={movement.cadence ?? 'monthly'}>
              <SelectTrigger id={'cadence-' + movement.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : (
        <Field>
          <FieldLabel htmlFor={'date-' + movement.id}>
            {movement.status === 'realized' ? 'Data em que aconteceu' : 'Data planejada'}
          </FieldLabel>
          <Input
            id={'date-' + movement.id}
            name={movement.status === 'realized' ? 'realizedDate' : 'plannedDate'}
            type="date"
            defaultValue={movement.realizedDate ?? movement.plannedDate}
            required
          />
        </Field>
      )}
    </FieldGroup>
  );
}
