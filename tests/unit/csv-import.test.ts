import { describe, expect, it } from 'vitest';
import {
  CSV_AI_PROMPT,
  CSV_FIELD_GUIDE,
  CSV_HEADERS,
  MAX_CSV_OCCURRENCES,
  csvTemplate,
  isValidCsvDate,
  parseCsvMoney,
  parseFinancialCsv,
} from '../../apps/web/src/lib/csv-import';

describe('financial CSV import', () => {
  it('provides the documented columns and parses realized payments separately from due dates', () => {
    const csv = `${csvTemplate()}recorrencia;Salário;income;1743,00;realizada;2026-08-10;2026-08-05;1743,00;monthly;2026-08-10;;12`;
    const result = parseFinancialCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      data_planejada: '2026-08-10',
      data_pagamento: '2026-08-05',
      quantidade_ocorrencias: '12',
    });
  });

  it('rejects incomplete realized rows before touching the database', () => {
    const csv = `${csvTemplate()}transacao;Conta;expense;100,00;realizada;2026-08-10;;;;;;`;
    expect(parseFinancialCsv(csv).errors).toContain(
      'Linha 2: data_pagamento é obrigatória para realizada.',
    );
  });

  it('parses Brazilian monetary values', () => {
    expect(parseCsvMoney('1.743,00')).toBe(174300);
    expect(() => parseCsvMoney('1.234,567')).toThrow('Valor CSV inválido.');
  });

  it('keeps the visual guide aligned with every import column', () => {
    expect(CSV_FIELD_GUIDE.map((field) => field.name)).toEqual([...CSV_HEADERS]);
    expect(CSV_FIELD_GUIDE.find((field) => field.name === 'data_pagamento')).toMatchObject({
      requirement: 'Condicional',
    });
    expect(CSV_FIELD_GUIDE.find((field) => field.name === 'descricao')?.format).toContain('160');
  });

  it('provides an AI prompt with the machine-readable import rules', () => {
    expect(CSV_AI_PROMPT).toContain(CSV_HEADERS.join(';'));
    expect(CSV_AI_PROMPT).toContain('uma transação por linha');
    expect(CSV_AI_PROMPT).toContain('Não invente valores');
  });

  it('accepts a realized amount that differs from its estimate', () => {
    const csv = `${csvTemplate()}transacao;Conta;expense;100,00;realizada;2026-08-10;2026-08-10;100,01;;;;`;
    expect(parseFinancialCsv(csv).errors).toEqual([]);
  });

  it('rejects recurrence rules that violate invariants', () => {
    const recurring = `${csvTemplate()}${[
      'recorrencia',
      'Plano',
      'expense',
      '100,00',
      'pendente',
      '2026-08-10',
      '',
      '',
      'weekly',
      '2026-08-11',
      '',
      String(MAX_CSV_OCCURRENCES + 1),
    ].join(';')}`;
    expect(parseFinancialCsv(recurring).errors.join(' ')).toContain(
      'inicio_recorrencia deve ser igual à primeira data_planejada.',
    );
    expect(parseFinancialCsv(recurring).errors.join(' ')).toContain(
      `quantidade_ocorrencias deve estar entre 1 e ${MAX_CSV_OCCURRENCES}.`,
    );
  });

  it('validates calendar dates instead of only checking their shape', () => {
    expect(isValidCsvDate('2026-02-28')).toBe(true);
    expect(isValidCsvDate('2026-02-31')).toBe(false);
    expect(isValidCsvDate('2026-13-01')).toBe(false);
  });

  it('rejects recurrence-only fields on simple transactions', () => {
    const csv = `${csvTemplate()}transacao;Conta;expense;100,00;pendente;2026-08-10;;;monthly;2026-08-10;;`;
    expect(parseFinancialCsv(csv).errors).toContain(
      'Linha 2: campos de recorrência só valem para recorrencia.',
    );
  });

  it('rejects ambiguous or malformed CSV structure', () => {
    const duplicateHeader = `${CSV_HEADERS.join(';')};descricao\n`;
    expect(parseFinancialCsv(duplicateHeader).errors).toEqual(['Colunas duplicadas: descricao.']);

    const malformed = `${CSV_HEADERS.join(';')}\ntransacao;\"Conta;expense;100,00;pendente;2026-08-10;;;;;;`;
    expect(parseFinancialCsv(malformed).errors).toEqual([
      'O arquivo CSV possui aspas não fechadas.',
    ]);
  });
});
