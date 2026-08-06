import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../actions/financial';
import { removePushSubscription } from '../../../../lib/notification-subscription';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) return NextResponse.json({ subscribed: false }, { status: 400 });
    await removePushSubscription(user.id, body.endpoint);
    return NextResponse.json({ subscribed: false });
  } catch {
    return NextResponse.json({ subscribed: false }, { status: 400 });
  }
}
