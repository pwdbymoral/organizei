'use client';

import { useActionState, useEffect, useState } from 'react';
import { importFinancialCsvFormAction, type FinancialFormState } from '../actions/financial';
import { Button } from './ui/button';
import { parseFinancialCsv } from '../lib/csv-import';

const initialState: FinancialFormState = { status: 'idle', message: '' };

export function CsvImportForm({ spaceId }: { spaceId: string }) {
  const [state, action, pending] = useActionState(importFinancialCsvFormAction, initialState);
  const [preview, setPreview] = useState<{ count: number; errors: string[]; sample: string[] }>({
    count: 0,
    errors: [],
    sample: [],
  });
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (state.status === 'success') window.location.reload();
  }, [state.status]);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="spaceId" value={spaceId} />
      <label className="grid gap-1 text-sm font-medium">
        Arquivo CSV
        <span className="text-text-muted font-normal">Até 2 MB, separado por ponto e vírgula.</span>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="border-border bg-background min-h-12 rounded-md border p-2 text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            setConfirmed(false);
            if (!file) {
              setPreview({ count: 0, errors: [], sample: [] });
              return;
            }
            const parsed = parseFinancialCsv(await file.text());
            setPreview({
              count: parsed.rows.length,
              errors: parsed.errors,
              sample: parsed.rows.slice(0, 5).map((row) => `${row.descricao} · ${row.situacao}`),
            });
          }}
        />
      </label>
      {preview.count > 0 && preview.errors.length === 0 && (
        <div className="bg-background grid gap-2 rounded-xl p-3 text-sm">
          <p className="font-medium">Prévia ({preview.count} linha(s))</p>
          <ul className="text-text-muted list-inside list-disc">
            {preview.sample.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
          <label className="text-text-muted flex items-start gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>Revisei a prévia e quero importar estas linhas.</span>
          </label>
        </div>
      )}
      {preview.errors.length > 0 && (
        <div role="alert" className="text-danger text-sm">
          {preview.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
      <Button type="submit" disabled={pending || !confirmed} className="min-h-12 w-full">
        {pending ? 'Importando…' : 'Importar CSV'}
      </Button>
      {state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="text-sm"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
