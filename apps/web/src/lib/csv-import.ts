export const CSV_HEADERS = [
  'tipo',
  'descricao',
  'direcao',
  'valor',
  'situacao',
  'data_planejada',
  'data_pagamento',
  'valor_realizado',
  'periodicidade',
  'inicio_recorrencia',
  'fim_recorrencia',
  'quantidade_ocorrencias',
] as const;

export type CsvFinancialRow = Record<(typeof CSV_HEADERS)[number], string>;

export function csvTemplate() {
  return `${CSV_HEADERS.join(';')}\n`;
}

export function parseFinancialCsv(input: string): { rows: CsvFinancialRow[]; errors: string[] } {
  const lines = parseLines(input);
  if (lines.length === 0) return { rows: [], errors: ['O arquivo está vazio.'] };
  const header = lines[0]!.map((value) => value.trim());
  const missing = CSV_HEADERS.filter((name) => !header.includes(name));
  if (missing.length) return { rows: [], errors: [`Colunas ausentes: ${missing.join(', ')}.`] };
  const indexes = new Map(header.map((name, index) => [name, index]));
  const rows: CsvFinancialRow[] = [];
  const errors: string[] = [];
  for (const [offset, values] of lines.slice(1).entries()) {
    if (values.every((value) => !value.trim())) continue;
    const row = Object.fromEntries(
      CSV_HEADERS.map((name) => [name, values[indexes.get(name)!]?.trim() ?? '']),
    ) as CsvFinancialRow;
    const line = offset + 2;
    const rowErrors = validateCsvRow(row);
    if (rowErrors.length) errors.push(`Linha ${line}: ${rowErrors.join(' ')}`);
    rows.push(row);
  }
  if (rows.length === 0 && errors.length === 0) errors.push('O arquivo não possui transações.');
  return { rows, errors };
}

export function validateCsvRow(row: CsvFinancialRow): string[] {
  const errors: string[] = [];
  if (!['transacao', 'recorrencia'].includes(row.tipo)) errors.push('tipo inválido.');
  if (!row.descricao || row.descricao.length > 160)
    errors.push('descrição obrigatória (até 160 caracteres).');
  if (!['income', 'expense'].includes(row.direcao))
    errors.push('direcao deve ser income ou expense.');
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(row.valor)) errors.push('valor inválido.');
  if (!['realizada', 'pendente'].includes(row.situacao))
    errors.push('situacao deve ser realizada ou pendente.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.data_planejada)) errors.push('data_planejada inválida.');
  if (row.situacao === 'realizada' && !/^\d{4}-\d{2}-\d{2}$/.test(row.data_pagamento)) {
    errors.push('data_pagamento é obrigatória para realizada.');
  }
  if (row.valor_realizado && !/^\d+(?:[,.]\d{1,2})?$/.test(row.valor_realizado))
    errors.push('valor_realizado inválido.');
  if (row.tipo === 'recorrencia' && !['weekly', 'monthly'].includes(row.periodicidade))
    errors.push('periodicidade inválida.');
  if (row.tipo === 'transacao' && row.periodicidade)
    errors.push('periodicidade só vale para recorrencia.');
  if (row.tipo === 'recorrencia' && !/^\d{4}-\d{2}-\d{2}$/.test(row.inicio_recorrencia))
    errors.push('inicio_recorrencia inválido.');
  if (row.quantidade_ocorrencias && !/^\d+$/.test(row.quantidade_ocorrencias))
    errors.push('quantidade_ocorrencias inválida.');
  if (row.fim_recorrencia && !/^\d{4}-\d{2}-\d{2}$/.test(row.fim_recorrencia))
    errors.push('fim_recorrencia inválido.');
  if (row.fim_recorrencia && row.quantidade_ocorrencias)
    errors.push('use fim_recorrencia ou quantidade_ocorrencias, não os dois.');
  return errors;
}

function parseLines(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ';' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

export function parseCsvMoney(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valor CSV inválido.');
  return Math.round(amount * 100);
}
