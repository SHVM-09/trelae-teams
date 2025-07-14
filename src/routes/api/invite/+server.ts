import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { invites, users } from "$lib/server/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { sendEmail } from "$lib/server/email";

export const POST = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	if (!session.user.id) return new Response("Forbidden", { status: 403 });
	const [u] = await db.select().from(users).where(eq(users.id, session.user.id));
	if (!u || u.role !== "admin") return new Response("Forbidden", { status: 403 });

	const { email } = await request.json();
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
		text: `Join: ${process.env.PUBLIC_SITE_URL}/dashboard/invite?token=${token}`
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