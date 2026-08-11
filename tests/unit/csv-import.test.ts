import { describe, expect, it } from 'vitest';
import { csvTemplate, parseCsvMoney, parseFinancialCsv } from '../../apps/web/src/lib/csv-import';

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
  });
});
