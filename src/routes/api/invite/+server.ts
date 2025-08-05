import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { invites, users, teams } from "$lib/server/db/schema";
import { randomUUID } from "crypto";
import { env } from "$env/dynamic/private";
import { eq, and, count } from "drizzle-orm";
import { sendEmail } from "$lib/server/email";

export const POST = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	if (!session.user.id) return new Response("Forbidden", { status: 403 });
	const [u] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!u || u.role !== "admin") return new Response("Forbidden", { status: 403 });

	const { email } = await request.json();
	if (!email || typeof email !== 'string') {
		return new Response("Invalid email", { status: 400 });
	}

	//  Check if user already exists in team
	const existingUser = await db.query.users.findFirst({
		where: (user, { eq }) => and(eq(user.email, email), eq(user.teamId, u.teamId!))
	});
	if (existingUser) {
		return new Response("User is already a team member", { status: 409 });
	}

	//  Check if already invited
	const existingInvite = await db.query.invites.findFirst({
		where: (inv, { eq, and }) => and(eq(inv.email, email), eq(inv.teamId, u.teamId!))
	});
	if (existingInvite) {
		return new Response("User already invited", { status: 409 });
	}

	// Enforce max seats
	const [team] = await db.select({ maxSeats: teams.maxSeats }).from(teams).where(eq(teams.id, u.teamId!));
	if (!team) return new Response("Team not found", { status: 404 });

	const [countResult] = await db
		.select({ count: count() })
		.from(users)
		.where(eq(users.teamId, u.teamId!));

	if (countResult.count >= team.maxSeats) {
		return new Response("Team has reached its member limit", { status: 403 });
	}

	//  Insert and send invite
	const token = randomUUID();
	await db.insert(invites).values({
		id: randomUUID(),
		email,
		teamId: u.teamId!,
		teamNamespaceId: u.teamNamespaceId!,
		publicNamespaceId: u.publicNamespaceId!,
		token
	});

	const result = await sendEmail({
		to: [email],
		subject: "You're invited to Trelae Teams",
		text: `Join: ${env.PUBLIC_SITE_URL}/dashboard/invite?token=${token}`
	});

	return json({ success: true });
};

export const DELETE = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const userId = session.user.id;
	if (!userId) return new Response("Forbidden", { status: 403 });

	const [u] = await db.select().from(users).where(eq(users.id, userId));
	if (!u || u.role !== "admin") return new Response("Forbidden", { status: 403 });

	const { id } = await request.json();
	if (!id) return new Response("Missing invite ID", { status: 400 });

	await db.delete(invites).where(eq(invites.id, id));

	return json({ success: true });
};