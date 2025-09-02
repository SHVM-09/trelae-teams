import { db } from '$lib/server/db';
import { users, invites, teams, files } from '$lib/server/db/schema';
import { eq, inArray, sum, and, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

// limits in bytes
const PLAN_LIMITS: Record<string, number> = {
	free: 5 * 1024 * 1024 * 1024,          // 5 GB
	basic: 50 * 1024 * 1024 * 1024,        // 50 GB
	pro: 500 * 1024 * 1024 * 1024,         // 500 GB
	enterprise: 1024 * 1024 * 1024 * 1024, // 1 TB
};

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user || !session.user.id) {
		return { session: null, members: [], invites: [], limits: null };
	}

	const [me] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!me) {
		return { session, members: [], invites: [], limits: null };
	}

	// ── MEMBERS & INVITES ────────────────────────────
	let teamMembers = [] as typeof users.$inferSelect[];
	let teamInvites = [] as typeof invites.$inferSelect[];

	if (me.teamId) {
		teamMembers = await db.select().from(users).where(eq(users.teamId, me.teamId));
		teamInvites = await db.select().from(invites).where(eq(invites.teamId, me.teamId));

		// Clean up invites where invited email is already a member
		const memberEmails = teamMembers.map((m) => m.email).filter(Boolean);
		const inviteEmails = teamInvites.map((i) => i.email);

		const emailsToDelete = inviteEmails.filter((email) => memberEmails.includes(email));
		if (emailsToDelete.length > 0) {
			await db.delete(invites).where(inArray(invites.email, emailsToDelete));
		}

		// Return only valid invites after cleanup
		teamInvites = teamInvites.filter((i) => !emailsToDelete.includes(i.email));
	}

	// ── LIMITS CALCULATION ────────────────────────────
	let plan = 'free';
	let used = 0;

	if (me.teamId) {
		const [team] = await db.select().from(teams).where(eq(teams.id, me.teamId));
		plan = team?.plan ?? 'free';

		const [result] = await db
			.select({ total: sum(files.size) })
			.from(files)
			.where(
				or(
					eq(files.namespaceId, me.teamNamespaceId!),
					eq(files.namespaceId, me.namespaceId!),
					eq(files.namespaceId, me.publicNamespaceId!)
				)
			);

		used = Number(result?.total ?? 0);
	} else {
		const [result] = await db
			.select({ total: sum(files.size) })
			.from(files)
			.where(
				or(
					and(eq(files.namespaceId, me.namespaceId), eq(files.userId, me.id)),
					and(eq(files.namespaceId, me.publicNamespaceId!), eq(files.userId, me.id)),
					and(eq(files.namespaceId, me.teamNamespaceId!), eq(files.userId, me.id))
				)
			);

		used = Number(result?.total ?? 0);
	}

	const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
	const limits = {
		used,
		limit,
		usedPercent: Math.min((used / limit) * 100, 100)
	};

	// ── RETURN ────────────────────────────
	return {
		session,
		members: teamMembers,
		invites: teamInvites,
		limits
	};
};