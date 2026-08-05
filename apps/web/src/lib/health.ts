export async function healthResponse(query: () => Promise<unknown>) {
  try {
    await query();
    return Response.json({ status: 'ok', database: 'reachable' });
  } catch {
    return Response.json({ status: 'degraded', database: 'unreachable' }, { status: 503 });
  }
}
