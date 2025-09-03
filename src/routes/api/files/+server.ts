import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { files as filesTable } from "$lib/server/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { trelae } from "$lib/trelae";

export const GET = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	// Visibility: private, team, public
	const visibility = url.searchParams.get('visibility') ?? 'private';

	const dbFiles = await db
		.select()
		.from(filesTable)
		.where(
			and(
				eq(filesTable.visibility, visibility)
			)
		);

	return json({ files: dbFiles });
};

export const POST = async ({ locals, request }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const body = await request.json();

	// Determine visibility for actions
	const visibility = body.visibility === 'team'
		? 'team'
		: body.visibility === 'public'
			? 'public'
			: 'private';

	// For team, use shared teamId as userId
	const isTeam = visibility === 'team';
	const userId = isTeam
		? (session.user as { teamId?: string }).teamId
		: session.user.id;


	if(!session.user.namespaceId && !session.user.teamNamespaceId && !session.user.publicNamespaceId) {
		return new Response("Namespace not configured for user", { status: 400 });
	}

	const namespaceId = isTeam
						? session.user.teamNamespaceId
						: visibility === 'public'
							? session.user.publicNamespaceId
							: session.user.namespaceId;

	if (!namespaceId) {
		return new Response("Namespace not configured for user", { status: 400 });
	}

	const namespace = trelae.namespace(namespaceId);

	// Delete
	if (body.action === 'delete') {
		const fileId = body.fileId;
		await trelae.file(fileId).delete();
		await db.delete(filesTable).where(eq(filesTable.id, fileId));
		return json({ ok: true });
	}

	// Bulk Delete
	if (body.action === 'bulk-delete') {
		const ids: string[] = body.fileIds;
		await trelae.files(ids).delete();
		await db.delete(filesTable).where(inArray(filesTable.id, ids));
		return json({ ok: true, deleted: ids });
	}

	// Download
	if (body.action === 'download') {
		const fileId = body.fileId;
		// @ts-expect-error
		const url = await trelae.file(fileId).getDownloadUrl({ expire: '1h' });
		return json({ url });
	}

	// Copy
	if (body.action === 'copy') {
		const { fileId, newLocation, name } = body;

		const trelaeFile = trelae.file(fileId);
		const originalName = trelaeFile.getName();
		let finalName = originalName ?? name;

		// Conflict check must use correct userId (team or individual)
		const conflict = await db.select().from(filesTable)
			.where(and(
				eq(filesTable.userId, userId!),
				eq(filesTable.location, newLocation),
				eq(filesTable.name, finalName)
			));

		if (conflict.length > 0) {
			const ext = finalName.includes('.') ? `.${finalName.split('.').pop()}` : '';
			const base = ext ? finalName.slice(0, -ext.length) : finalName;

			let i = 1;
			let newCandidate = `${base} (${i})${ext}`;

			while (await db.select().from(filesTable)
				.where(and(
					eq(filesTable.userId, userId!),
					eq(filesTable.location, newLocation),
					eq(filesTable.name, newCandidate)
				))
				.then(r => r.length > 0)) {
				i++;
				newCandidate = `${base} (${i})${ext}`;
			}

			finalName = newCandidate;
		}

		// Actually copy
		const copied = await trelaeFile.copy({
			newLocation,
			newName: finalName
		});

		await db.insert(filesTable).values({
			id: copied.getId(),
			userId: userId!,
			name: finalName,
			location: newLocation,
			namespaceId,
			status: 'uploaded',
			type: 'file',
			size: (await copied.getMetaData()).size,
			visibility
		});

		return json({ ok: true, copiedId: copied.getId() });
	}

	// Move
	if (body.action === 'move') {
		const { fileId, newLocation, newName } = body;
		if (!fileId) {
			return new Response('Missing fileId', { status: 400 });
		}

		const trelaeFile = trelae.file(fileId);

		const originalName = await trelaeFile.getName();
		const finalName = newName || originalName;

		const moved = await trelaeFile.move({
			newLocation,
			newName: finalName
		});

		await db
			.update(filesTable)
			.set({
				name: finalName,
				location: newLocation,
				namespaceId,
				visibility,
				userId // move may change ownership
			})
			.where(eq(filesTable.id, fileId));

		return json({ ok: true, movedId: moved.getId() });
	}

	return json({ ok: false, message: 'Unknown action' });
};