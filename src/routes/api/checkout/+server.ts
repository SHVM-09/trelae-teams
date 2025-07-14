// src/routes/api/checkout/+server.ts

import { json } from "@sveltejs/kit";
import { randomUUID } from "crypto";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { trelae } from "$lib/trelae";
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

	// Create a namespace for the team
	const namespace = await trelae.createNamespace({
		name: `tns-${teamId}`,
		region: 'us-east-1',
		isPublic: false
	});
	if (!namespace) {
		return new Response("Failed to create namespace", { status: 500 });
	}
	const namespaceId = namespace.getId();

	// Create a public namespace for the team
	const publicNamespace = await trelae.createNamespace({
		name: `pns-${teamId}`,
		region: 'us-east-1',
		isPublic: false
	});
	if (!publicNamespace) {
		return new Response("Failed to create public namespace", { status: 500 });
	}
	const publicNamespaceId = publicNamespace.getId();

	// Update user with namespace IDs
	await db
		.update(users)
		.set({
			namespaceId,
			publicNamespaceId,
			teamNamespaceId: namespaceId,
			teamId
		})
		.where(eq(users.id, user.id));

	const checkoutUrl = `https://fake-checkout.com/plan/${plan}`;
	return json({ url: checkoutUrl });
};