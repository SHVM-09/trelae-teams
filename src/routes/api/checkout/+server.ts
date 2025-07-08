// src/routes/api/checkout/+server.ts

import { json } from "@sveltejs/kit";
import { randomUUID } from "crypto";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

export const POST = async ({ request }) => {
	const { plan, email } = await request.json();

	if (!plan || !email) {
		return new Response("Missing plan or email", { status: 400 });
	}

	const user = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.email, email)
	});

	if (!user) {
		return new Response("User not found", { status: 404 });
	}

	// ✅ Make them admin + new team
	const teamId = randomUUID();
	await db
		.update(users)
		.set({ role: "admin", teamId })
		.where(eq(users.id, user.id));

	const checkoutUrl = `https://fake-checkout.com/plan/${plan}`;
	return json({ url: checkoutUrl });
};