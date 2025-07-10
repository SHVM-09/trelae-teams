// src/routes/dashboard/+server.ts
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

export const GET = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	if (!session.user.id) return new Response("Unauthorized", { status: 401 });
	const [me] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!me || !me.teamId) return json({ members: [] });

	const teamMembers = await db
		.select()
		.from(users)
		.where(eq(users.teamId, me.teamId));

	return json({ members: teamMembers });
};

export const POST = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	if (!session.user.id) return new Response("Unauthorized", { status: 401 });
	const [me] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!me || me.role !== "admin") return new Response("Forbidden", { status: 403 });

	const { action, userId, role } = await request.json();

	if (action === "delete") {
		await db.delete(users).where(eq(users.id, userId));
	} else if (action === "update" && role) {
		await db.update(users).set({ role }).where(eq(users.id, userId));
	}

	return json({ success: true });
};