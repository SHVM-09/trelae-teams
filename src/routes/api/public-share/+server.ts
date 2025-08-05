// src/routes/api/public-share/+server.ts
import { json } from "@sveltejs/kit";
import { db }   from "$lib/server/db";
import { users, teams } from "$lib/server/db/schema";
import { eq }   from "drizzle-orm";
import { env } from "$env/dynamic/private";
import { sendEmail } from "$lib/server/email";

export const POST = async ({ request, locals }) => {
	/* ── 1. Auth & role guard ─────────────────────────────────────────── */
	const session = await locals.auth();
	if (!session?.user?.id)   return new Response("Unauthorized", { status: 401 });

	const [admin] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!admin || admin.role !== "admin" || !admin.teamId)
		return new Response("Forbidden", { status: 403 });

	/* ── 2. Validate payload ──────────────────────────────────────────── */
	const { email } = await request.json();
	if (!email || typeof email !== "string")
		return new Response("Invalid email", { status: 400 });

	/* ── 3. Fetch team info ───────────────────────────────────────────── */
	const [team] = await db
		.select({ id: teams.id, pw: teams.publicPasswordPlain })
		.from(teams)
		.where(eq(teams.id, admin.teamId));

	if (!team) return new Response("Team not found", { status: 404 });

	/* ── 4. Send email with Team-ID & public-files password ───────────── */
	await sendEmail({
		to: [email],
		subject: "Access to Trelae – Public Files",
		text: [
			`You’ve been given access to public files for team ${team.id}.`,
			"",
			`Team ID : ${team.id}`,
			`Password: ${team.pw ?? "(no password set)"}`,
			"",
			`Visit ${env.PUBLIC_SITE_URL}/public-files to unlock the files.`
		].join("\n")
	});

	return json({ success: true });
};