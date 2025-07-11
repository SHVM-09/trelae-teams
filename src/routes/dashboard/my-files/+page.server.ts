import { db } from '$lib/server/db';
import { files as filesTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user) {
		return {
			files: []
		};
	}

	// Load files that belong to the user AND have visibility 'private'
	const files = await db
		.select()
		.from(filesTable)
		.where(
			and(
				eq(filesTable.userId, session.user.id!),
				eq(filesTable.visibility, 'private')
			)
		);

	return { files };
};