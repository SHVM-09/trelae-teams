import { db } from '$lib/server/db';
import { users, invites } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
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

	// Clean up invites where invited email is already a member
	const memberEmails = teamMembers.map((m) => m.email).filter(Boolean);
	const inviteEmails = teamInvites.map((i) => i.email);

	const emailsToDelete = inviteEmails.filter(email => memberEmails.includes(email));
	if (emailsToDelete.length > 0) {
		await db
			.delete(invites)
			.where(inArray(invites.email, emailsToDelete));
	}

	// Return only valid invites after cleanup
	const updatedInvites = teamInvites.filter(i => !emailsToDelete.includes(i.email));

	return {
		session,
		members: teamMembers,
		invites: updatedInvites
	};
};