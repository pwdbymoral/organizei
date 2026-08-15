'use client';

import { useState } from 'react';
import { Check, ChevronDown, Copy, FileUp } from 'lucide-react';
import { CSV_AI_PROMPT, CSV_FIELD_GUIDE } from '../lib/csv-import';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { CsvImportForm } from './csv-import-form';

export function CsvImportSheet({ spaceId }: { spaceId: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(CSV_AI_PROMPT);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto" aria-haspopup="menu">
            Mais ações
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setSheetOpen(true);
            }}
          >
            <FileUp aria-hidden="true" />
            Importar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl"
          aria-describedby="csv-import-description"
        >
          <SheetHeader className="border-border border-b px-4 pb-4 sm:px-6">
            <SheetTitle>Importar transações por CSV</SheetTitle>
            <SheetDescription id="csv-import-description">
              Use o modelo, confira as regras e revise as linhas antes de confirmar.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-6 px-4 pb-6 sm:px-6">
            <section className="grid gap-2" aria-labelledby="csv-model-title">
              <h3 id="csv-model-title" className="font-semibold">
                1. Prepare o arquivo
              </h3>
              <p className="text-text-muted text-sm">
                O arquivo usa ponto e vírgula como separador e uma transação por linha.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="min-h-10">
                  <a href="/api/financial/csv-template" download>
                    Baixar modelo CSV
                  </a>
                </Button>
                <Button type="button" variant="outline" className="min-h-10" onClick={copyPrompt}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? 'Prompt copiado' : 'Copiar prompt para IA'}
                </Button>
              </div>
              <details className="border-border rounded-xl border p-3">
                <summary className="cursor-pointer font-medium">Ver prompt para IA</summary>
                <pre className="bg-background text-text-muted mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg p-3 text-xs">
                  {CSV_AI_PROMPT}
                </pre>
              </details>
            </section>

            <section className="grid gap-2" aria-labelledby="csv-rules-title">
              <h3 id="csv-rules-title" className="font-semibold">
                2. Confira o formato
              </h3>
              <div
                className="border-border overflow-x-auto rounded-xl border"
                tabIndex={0}
                aria-label="Tabela de campos do CSV; deslize horizontalmente para ver todas as colunas"
              >
                <table className="w-full min-w-[680px] text-left text-sm">
                  <caption className="sr-only">Campos aceitos no CSV</caption>
                  <thead className="bg-muted text-text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Coluna
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Preenchimento
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Formato e exemplo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CSV_FIELD_GUIDE.map((field) => (
                      <tr key={field.name} className="border-border border-t align-top">
                        <th scope="row" className="px-3 py-2 font-mono text-xs font-medium">
                          {field.name}
                        </th>
                        <td className="px-3 py-2">{field.requirement}</td>
                        <td className="px-3 py-2">
                          <span className="block">{field.format}</span>
                          <span className="text-text-muted mt-1 block">Ex.: {field.example}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-text-muted text-xs">
                Para evitar importações incorretas, não inclua títulos, totais ou comentários no
                arquivo.
              </p>
            </section>

            <section
              className="border-border grid gap-3 border-t pt-5"
              aria-labelledby="csv-upload-title"
            >
              <h3 id="csv-upload-title" className="font-semibold">
                3. Selecione e revise
              </h3>
              <CsvImportForm spaceId={spaceId} />
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
