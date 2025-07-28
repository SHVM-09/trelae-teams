// src/routes/api/team/public-password/+server.ts
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { users, teams } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { hash as bcryptHash } from "bcryptjs";

export const POST = async ({ request, locals }) => {
	// --------- 1. Auth --------------------------------------------------
	const session = await locals.auth();
	if (!session?.user?.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	// --------- 2. Validate body ----------------------------------------
	const { password } = await request.json();
	if (typeof password !== "string" || !password.trim()) {
		return new Response("Missing or invalid password", { status: 400 });
	}
	const plain = password.trim();

	// --------- 3. Check caller is admin --------------------------------
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, session.user.id));

	if (!user || user.role !== "admin" || !user.teamId) {
		return new Response("Forbidden", { status: 403 });
	}

	// --------- 4. Hash & persist --------------------------------------
	const hashed = await bcryptHash(plain, 12);      // 12-round bcrypt hash

	await db
		.update(teams)
		.set({ publicPassword: hashed })
		.where(eq(teams.id, user.teamId));

	return json({ success: true });
};