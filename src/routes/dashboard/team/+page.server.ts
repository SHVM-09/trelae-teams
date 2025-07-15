import { db } from '$lib/server/db';
import { users, invites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return {
			session: null,
			members: [],
			invites: []
		};
	}

	const [me] = await db
		.select()
		.from(users)
		.where(eq(users.id, session.user.id));

	if (!me?.teamId) {
		return {
			session,
			members: [],
			invites: []
		};
	}

	const members = await db
		.select()
		.from(users)
		.where(eq(users.teamId, me.teamId));

	const invitesList = await db
		.select()
		.from(invites)
		.where(eq(invites.teamId, me.teamId));

	return {
		session,
		members,
		invites: invitesList
	};
};