import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { files as filesTable } from "$lib/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { trelae } from "$lib/trelae";

export const GET = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	// Get all file rows for user
	const dbFiles = await db
		.select()
		.from(filesTable)
		.where(eq(filesTable.userId, session.user.id as string));

	// Optionally: If you want to sync from namespace, you could:
	// const namespace = trelae.namespace('YOUR_NAMESPACE_ID');
	// const { files } = await namespace.getFiles();

	return json({ files: dbFiles });
};

export const POST = async ({ locals, request }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const body = await request.json();

	if (body.action === 'delete') {
		const fileId = body.fileId;
		await trelae.file(fileId).delete();
		await db.delete(filesTable).where(eq(filesTable.id, fileId));
		return json({ ok: true });
	}

	if (body.action === 'bulk-delete') {
		const ids: string[] = body.fileIds;
		const files = trelae.files(ids);
		await files.delete();
		await db.delete(filesTable).where(inArray(filesTable.id, ids));
		return json({ ok: true, deleted: ids });
	}

	if (body.action === 'download') {
		const fileId = body.fileId;
		// @ts-expect-error
		const url = await trelae.file(fileId).getDownloadUrl({ expire: '1h' });
		return json({ url });
	}

	return json({ ok: true });
};