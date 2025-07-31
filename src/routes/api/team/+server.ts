// src/routes/api/team/+server.ts
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { users, teams } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { hash as bcryptHash } from "bcryptjs";

export const POST = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

	const { password } = await request.json();
	if (typeof password !== "string" || !password.trim())
		return new Response("Missing or invalid password", { status: 400 });
	const plain = password.trim();

	const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!user || user.role !== "admin" || !user.teamId)
		return new Response("Forbidden", { status: 403 });

	/*  NOTE:  we now keep BOTH the bcrypt-hash (for auth) AND the
	          plaintext (so an admin can copy / share it later).   */
	const hashed = await bcryptHash(plain, 12);

	await db
		.update(teams)
		.set({ publicPassword: hashed, publicPasswordPlain: plain }) // ← add this column once in your migration
		.where(eq(teams.id, user.teamId));

	return json({ success: true });
};

export const GET = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

	const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!user || user.role !== "admin" || !user.teamId)
		return new Response("Forbidden", { status: 403 });

	const [team] = await db
		.select({ id: teams.id, pw: teams.publicPasswordPlain })
		.from(teams)
		.where(eq(teams.id, user.teamId));

	return json({ teamId: team.id, password: team.pw ?? "" });
};