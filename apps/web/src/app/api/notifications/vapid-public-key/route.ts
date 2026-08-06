import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../actions/financial';

export async function GET() {
  await requireAuth();
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ enabled: false }, { status: 503 });
  return NextResponse.json({ enabled: true, publicKey: key });
}
