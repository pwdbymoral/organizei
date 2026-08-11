import { NextResponse } from 'next/server';
import { csvTemplate } from '../../../../lib/csv-import';

export function GET() {
  return new NextResponse(csvTemplate(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="organizei-transacoes-modelo.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
