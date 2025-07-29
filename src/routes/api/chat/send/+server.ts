import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL ?? 'http://localhost:3001';

export const POST = async ({ locals, request, fetch }) => {
  const session = await locals.auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const message: string = String(body.message ?? '').trim();
  if (!message) return new Response('Message required', { status: 400 });

  // Find team (room)
  let teamId = (session.user as any)?.teamId as string | undefined;
  if (!teamId) {
    const [me] = await db.select().from(users).where(eq(users.id, session.user.id));
    if (!me?.teamId) return new Response('No team', { status: 400 });
    teamId = me.teamId;
  }

  const room   = `team-${teamId}`;
  const user   = session.user.name ?? 'Anonymous';
  const userId = session.user.id; // 👈 send a stable id

  const r = await fetch(`${SOCKET_SERVER_URL}/api/chat/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, message, user, userId }) // 👈 include userId
  });

  if (!r.ok) {
    const err = await r.text();
    console.error('Broadcast failed:', err);
    return new Response(`Broadcast failed: ${err}`, { status: 500 });
  }

  return json({ ok: true });
};