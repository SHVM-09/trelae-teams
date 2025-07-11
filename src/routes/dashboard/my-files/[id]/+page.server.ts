// my-files/[id]/+page.server.ts

import { db } from '$lib/server/db';
import { files as filesTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { trelae } from '$lib/trelae';
import { error, json } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user) throw error(401, 'Unauthorized');

	const fileId = params.id;

	const file = await db
		.select()
		.from(filesTable)
		.where(eq(filesTable.id, fileId))
		.then((rows) => rows[0]);

	if (!file) throw error(404, 'Not found');
	if (file.userId !== session.user.id) throw error(403, 'Forbidden');

	let downloadUrl: string | null = null;

	if (file.type === 'file') {
		// @ts-expect-error
		downloadUrl = await trelae.file(file.id).getDownloadUrl({ expire: '1h' });
	}

	return { file, downloadUrl };
};