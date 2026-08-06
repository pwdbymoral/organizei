import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../actions/financial';
import {
  savePushSubscription,
  type PushSubscriptionInput,
} from '../../../../lib/notification-subscription';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const input = (await request.json()) as PushSubscriptionInput;
    await savePushSubscription(user.id, input);
    return NextResponse.json({ subscribed: true });
  } catch {
    return NextResponse.json({ subscribed: false }, { status: 400 });
  }
}
