// File: src/routes/dashboard/public-files/+page.server.ts
import { db } from '$lib/server/db';
import { files as filesTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const session  = await locals.auth();
	const cookieOK = cookies.get('public_access') === 'true';
	const cookieId = cookies.get('public_team_id') ?? undefined;

	// ---------- determine team & permission ----------
	let teamId: string | undefined;
	let canEdit = false;          // ⇠ NEW: default - cannot mutate

	if (session?.user?.teamId) {
		teamId   = session.user.teamId;
		canEdit  = true;                          // logged-in member can mutate
	} else if (cookieOK && cookieId) {
		teamId   = cookieId;                      // visitor with password
		// canEdit stays **false**
	}

	// not authorised yet → no files
	if (!teamId) {
		return { files: [], accessGranted: false, canEdit };
	}

	// fetch public files once authorised
	const files = await db
		.select()
		.from(filesTable)
		.where(and(eq(filesTable.visibility, 'public')));

	return { files, accessGranted: true, teamId, canEdit };
};