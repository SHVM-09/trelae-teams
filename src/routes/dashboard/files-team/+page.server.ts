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

	// Same logic, but filter for team files
	const files = await db
		.select()
		.from(filesTable)
		.where(
			and(
				eq(filesTable.visibility, 'team')
			)
		);

	return { files };
};