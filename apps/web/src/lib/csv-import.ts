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

export type CsvFieldGuide = {
  name: (typeof CSV_HEADERS)[number];
  label: string;
  requirement: 'Obrigatória' | 'Opcional' | 'Condicional';
  format: string;
  example: string;
};

export const CSV_FIELD_GUIDE: CsvFieldGuide[] = [
  {
    name: 'tipo',
    label: 'Tipo do lançamento',
    requirement: 'Obrigatória',
    format: '`transacao` ou `recorrencia`',
    example: 'transacao',
  },
  {
    name: 'descricao',
    label: 'Descrição',
    requirement: 'Obrigatória',
    format: 'Texto com até 160 caracteres',
    example: 'Conta de luz',
  },
  {
    name: 'direcao',
    label: 'Entrada ou saída',
    requirement: 'Obrigatória',
    format: '`income` ou `expense`',
    example: 'expense',
  },
  {
    name: 'valor',
    label: 'Valor previsto',
    requirement: 'Obrigatória',
    format: 'Número positivo; aceita `1234,56` ou `1.234,56`',
    example: '189,90',
  },
  {
    name: 'situacao',
    label: 'Situação',
    requirement: 'Obrigatória',
    format: '`realizada` ou `pendente`',
    example: 'pendente',
  },
  {
    name: 'data_planejada',
    label: 'Data planejada',
    requirement: 'Obrigatória',
    format: 'Data no formato `AAAA-MM-DD`',
    example: '2026-08-20',
  },
  {
    name: 'data_pagamento',
    label: 'Data do pagamento',
    requirement: 'Condicional',
    format: 'Obrigatória quando `situacao=realizada`; senão, vazia',
    example: '2026-08-18',
  },
  {
    name: 'valor_realizado',
    label: 'Valor realizado',
    requirement: 'Opcional',
    format: 'Número positivo; vazio quando não houver pagamento parcial',
    example: '189,90',
  },
  {
    name: 'periodicidade',
    label: 'Periodicidade',
    requirement: 'Condicional',
    format: '`weekly` ou `monthly` somente para `tipo=recorrencia`',
    example: 'monthly',
  },
  {
    name: 'inicio_recorrencia',
    label: 'Início da recorrência',
    requirement: 'Condicional',
    format: 'Data `AAAA-MM-DD` para recorrências; vazia para transações',
    example: '2026-08-20',
  },
  {
    name: 'fim_recorrencia',
    label: 'Fim da recorrência',
    requirement: 'Opcional',
    format: 'Data `AAAA-MM-DD`; não use junto com `quantidade_ocorrencias`',
    example: '2027-08-20',
  },
  {
    name: 'quantidade_ocorrencias',
    label: 'Quantidade de ocorrências',
    requirement: 'Opcional',
    format: 'Número inteiro; não use junto com `fim_recorrencia`',
    example: '12',
  },
];

export const CSV_AI_PROMPT = `Converta os dados financeiros anexados para o modelo CSV do Organizei.

Regras:
- Mantenha exatamente estes cabeçalhos e nesta ordem: ${CSV_HEADERS.join(';')}
- Use separador ponto e vírgula (;), uma transação por linha e datas no formato AAAA-MM-DD.
- Use somente: tipo=transacao ou recorrencia; direcao=income ou expense; situacao=realizada ou pendente; periodicidade=weekly ou monthly.
- Para recorrências, preencha periodicidade e inicio_recorrencia. Use apenas um entre fim_recorrencia e quantidade_ocorrencias.
- Para realizadas, preencha data_pagamento. Deixe campos opcionais vazios quando não houver informação.
- Não invente valores, datas ou recorrências. Liste as ambiguidades antes do CSV.
- Entregue somente o CSV final depois que as ambiguidades forem resolvidas.`;

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
