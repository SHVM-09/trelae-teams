import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { files as filesTable } from "$lib/server/db/schema";
import { trelae } from "$lib/trelae";
import { eq, and } from "drizzle-orm";

export const POST = async ({ locals, request }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const { name, location, visibility } = await request.json();
	if (!name) return new Response("Folder name required", { status: 400 });
	
	if(!session.user.namespaceId && !session.user.teamNamespaceId && !session.user.publicNamespaceId) {
		return new Response("Namespace not configured for user", { status: 400 });
	}

	// Pick namespace based on visibility
	const namespaceId =
		visibility === 'team'
			? session.user.teamNamespaceId
			: visibility === 'public'
				? session.user.publicNamespaceId
				: session.user.namespaceId;

	if (!namespaceId) {
		return new Response("Namespace ID is missing.", { status: 400 });
	}

	const namespace = trelae.namespace(namespaceId);

	// Optional: check duplicate folder name in same location
	const existing = await db
		.select()
		.from(filesTable)
		.where(
			and(
				eq(filesTable.userId, session.user.id!),
				eq(filesTable.name, name),
				eq(filesTable.location, location),
				eq(filesTable.type, 'folder'),
				eq(filesTable.visibility, visibility ?? 'private')
			)
		);

	if (existing.length) {
		return new Response("A folder with this name already exists here.", { status: 409 });
	}

	// Create folder in namespace
	const folder = await namespace.createFolder(name, location);

	// Insert into DB with correct visibility
	await db.insert(filesTable).values({
		id: folder.getId(),
		userId: session.user.id!,
		name,
		location,
		namespaceId,
		type: 'folder',
		size: 0,
		status: 'uploaded',
		visibility: visibility ?? 'private'
	});

	return json({ id: folder.getId(), name });
};