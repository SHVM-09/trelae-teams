// src/routes/api/team/delete/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, teams, invites, messages, files as filesTable } from '$lib/server/db/schema';
import { trelae } from '$lib/trelae';
import { and, eq, inArray, or } from 'drizzle-orm';

export const DELETE = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response('Unauthorized', { status: 401 });
	}

	const userId = session.user.id;
	const teamId = session.user.teamId;
	const isAdmin = session.user.role === 'admin';

	if (!teamId || !isAdmin) {
		return new Response('Forbidden', { status: 403 });
	}

	// 1 ▸ Get team record
	const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
	if (!team) return new Response('Team not found', { status: 404 });

	// 2 ▸ Get namespace IDs for deletion
	const [nsInfo] = await db
		.select({
			teamNamespaceId: users.teamNamespaceId,
			publicNamespaceId: users.publicNamespaceId
		})
		.from(users)
		.where(and(eq(users.teamId, teamId), eq(users.role, 'admin')));

	// 3 ▸ Delete team & public Trelae namespaces
	const deleteNs = async (nsId?: string | null) => {
		if (!nsId) return;
		try {
			await trelae.namespace(nsId).delete();
		} catch (err) {
			console.error('Failed to delete namespace', nsId, err);
		}
	};

	await Promise.all([
		deleteNs(nsInfo?.teamNamespaceId),
		deleteNs(nsInfo?.publicNamespaceId)
	]);

	// 4 ▸ Delete all team messages and invites
	await db.delete(messages).where(eq(messages.room, `team-${teamId}`));
	await db.delete(invites).where(eq(invites.teamId, teamId));

	// 5 ▸ Fetch all users in the team
	const teamUsers = await db.select().from(users).where(eq(users.teamId, teamId));
	const userIds = teamUsers.map(u => u.id);

	// 6 ▸ Get all `team` and `public` files owned by these users
	const teamFiles = await db
		.select({ id: filesTable.id })
		.from(filesTable)
		.where(
			and(
				inArray(filesTable.userId, userIds),
				or(eq(filesTable.visibility, 'team'), eq(filesTable.visibility, 'public'))
			)
		);

	const fileIds = teamFiles.map(f => f.id);

	// 7 ▸ Delete from Trelae & DB
	if (fileIds.length) {
		await trelae.files(fileIds).delete();
		await db.delete(filesTable).where(inArray(filesTable.id, fileIds));
	}

	// 8 ▸ Remove users from team
	await db
		.update(users)
		.set({
			role: 'member',
			teamId: null,
			teamNamespaceId: null,
			publicNamespaceId: null
		})
		.where(eq(users.teamId, teamId));

	// 9 ▸ Finally delete the team
	await db.delete(teams).where(eq(teams.id, teamId));

	return json({ success: true });
};