import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, teams, invites, messages } from '$lib/server/db/schema';
import { trelae } from '$lib/trelae';
import { and, eq } from 'drizzle-orm';

export const DELETE = async ({ locals }) => {

  const session = await locals.auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId  = session.user.id;
  const teamId  = session.user.teamId;
  const isAdmin = session.user.role === 'admin';

  if (!teamId || !isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return new Response('Team not found', { status: 404 });

  const [nsInfo] = await db
    .select({
      teamNamespaceId   : users.teamNamespaceId,
      publicNamespaceId : users.publicNamespaceId
    })
    .from(users)
    .where(and(eq(users.teamId, teamId), eq(users.role, 'admin')));

  const deleteNs = async (nsId?: string | null) => {
    if (!nsId) return;
    try {
      await trelae.namespace(nsId).delete();
    } catch { /* swallow – still attempt other clean-ups */ }
  };

  await Promise.all([
    deleteNs(nsInfo?.teamNamespaceId),
    deleteNs(nsInfo?.publicNamespaceId)
  ]);

  await db.delete(messages).where(eq(messages.room, `team-${teamId}`));

  await db.delete(invites).where(eq(invites.teamId, teamId));

  await db
    .update(users)
    .set({
      role              : 'member',
      teamId            : null,
      teamNamespaceId   : null,
      publicNamespaceId : null
    })
    .where(eq(users.teamId, teamId));

  await db.delete(teams).where(eq(teams.id, teamId));

  return json({ success: true });
};