import { db } from '$lib/server/db';
import { users, invites } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user || !session.user.id) {
		return { session: null, members: [], invites: [] };
	}

	const [me] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!me || !me.teamId) {
		return { session, members: [], invites: [] };
	}

	const teamMembers = await db
		.select()
		.from(users)
		.where(eq(users.teamId, me.teamId));

	const teamInvites = await db
		.select()
		.from(invites)
		.where(eq(invites.teamId, me.teamId));

	return {
		session,
		members: teamMembers,
		invites: teamInvites
	};
};