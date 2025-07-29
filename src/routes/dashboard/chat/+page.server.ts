import { db } from '$lib/server/db';
import { users, invites, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return { session: null, teamId: null, channel: null, members: [], invites: [], messages: [] };
  }

  const [me] = await db.select().from(users).where(eq(users.id, session.user.id));

  if (!me?.teamId) {
    return { session, teamId: null, channel: null, members: [], invites: [], messages: [] };
  }

  const members = await db.select().from(users).where(eq(users.teamId, me.teamId));
  const invitesList = await db.select().from(invites).where(eq(invites.teamId, me.teamId));

  const channel = `team-${me.teamId}`;
  const oldMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.room, channel))
    .orderBy(messages.createdAt);

  return {
    session,
    teamId: me.teamId,
    channel,
    members,
    invites: invitesList,
    messages: oldMessages
  };
};