import { db } from '$lib/server/db';
import { users, invites, teams } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return {
			session: null,
			members: [],
			invites: [],
			maxSeats: 0,
			occupiedSeats: 0
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
			invites: [],
			maxSeats: 0,
			occupiedSeats: 0
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

	const [team] = await db
		.select({ maxSeats: teams.maxSeats })
		.from(teams)
		.where(eq(teams.id, me.teamId));

	return {
		session,
		members,
		invites: invitesList,
		maxSeats: team?.maxSeats ?? 0,
		occupiedSeats: members.length + invitesList.length
	};
};