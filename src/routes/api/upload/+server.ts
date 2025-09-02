// src/routes/api/upload/+server.ts
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { files, teams, users } from "$lib/server/db/schema";
import { eq, sum, and, or } from "drizzle-orm";
import { trelae } from "$lib/trelae";

// limits in bytes
const PLAN_LIMITS: Record<string, number> = {
	free: 5 * 1024 * 1024 * 1024,          // 5 GB
	basic: 50 * 1024 * 1024 * 1024,        // 50 GB
	pro: 500 * 1024 * 1024 * 1024,         // 500 GB
	enterprise: 1024 * 1024 * 1024 * 1024, // 1 TB
};

export const POST = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const { filename, visibility, location, type, size } = await request.json();
	if (!filename) return new Response("Filename required", { status: 400 });

	// Pick namespace dynamically based on visibility
	let namespaceId: string;

	if (visibility === 'team') {
		if (!session.user.teamNamespaceId) {
			return new Response("Team namespace not configured for user", { status: 400 });
		}
		namespaceId = session.user.teamNamespaceId;
	} else if (visibility === 'public') {
		if (!session.user.publicNamespaceId) {
			return new Response("Public namespace not configured for user", { status: 400 });
		}
		namespaceId = session.user.publicNamespaceId;
	} else {
		if (!session.user.namespaceId) {
			return new Response("Private namespace not configured for user", { status: 400 });
		}
		namespaceId = session.user.namespaceId;
	}

	let plan = "free";
	let used = 0;

	if (session.user.teamId) {
		// TEAM usage
		const [team] = await db.select().from(teams).where(eq(teams.id, session.user.teamId));
		plan = team?.plan ?? "free";

		const [result] = await db
			.select({ total: sum(files.size) })
			.from(files)
			.where(
				or(
					eq(files.namespaceId, session.user.teamNamespaceId!),
					eq(files.namespaceId, session.user.namespaceId!),
					eq(files.namespaceId, session.user.publicNamespaceId!)
				)
			);

		used = Number(result?.total ?? 0);
	} else {
		// INDIVIDUAL usage
		const [dbUser] = await db.select().from(users).where(eq(users.id, session.user.id!));

		const [result] = await db
			.select({ total: sum(files.size) })
			.from(files)
			.where(
				or(
					eq(files.namespaceId, dbUser.namespaceId),
					eq(files.userId, dbUser.id)
				)
			);

		used = Number(result?.total ?? 0);
	}

	const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

	// Prevent upload if limit exceeded
	if (used + Number(size) > limit) {
		return new Response("Storage limit exceeded. Upgrade your plan to upload more files.", { status: 403 });
	}

	// ── STEP 3: existing duplicate filename check (unchanged) ────────────────
	const namespace = trelae.namespace(namespaceId);

	// Check for duplicate name for user
	const existing = await db
		.select()
		.from(files)
		.where(
			and(
				eq(files.userId, session.user.id!),
				eq(files.name, filename),
				eq(files.location, location)
			)
		);

	let nameToUse = filename;
	let suffix = 1;

	while (true) {
		// Local check
		const localExists = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.userId, session.user.id!),
					eq(files.name, nameToUse),
					eq(files.location, location)
				)
			);

		// Remote check: fetch all IDs at that location
		const { files: remoteFiles } = await namespace.getFiles({
			location,
			limit: 50 // adjust if needed
		});

		// Check each remote file’s metadata.name
		let remoteConflict = false;
		for (const remoteFile of remoteFiles) {
			const name = remoteFile.getName();
			if (name === nameToUse) {
				remoteConflict = true;
				break;
			}
		}

		if (!localExists.length && !remoteConflict) break;

		// Bump version
		const parts = filename.split(".");
		if (parts.length > 1) {
			const ext = parts.pop();
			nameToUse = `${parts.join(".")}_v${++suffix}.${ext}`;
		} else {
			nameToUse = `${filename}_v${++suffix}`;
		}
	}

	const { id, uploadUrl } = await namespace.getUploadUrl({
		name: nameToUse,
		location,
		expiry: '1h',
	});

	await db.insert(files).values({
		id,
		userId: session.user.id!,
		name: nameToUse,
		location,
		type: type || 'file',
		size: Number(size) || 0,
		namespaceId: namespaceId,
		status: 'pending',
		visibility: visibility || "private",
	});

	return json({ uploadUrl, fileId: id, name: nameToUse });
};

// src/routes/api/upload/+server.ts (append this below POST)
export const PUT = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const { fileId } = await request.json();
	if (!fileId) return new Response("Missing fileId", { status: 400 });

	await db
		.update(files)
		.set({ status: "uploaded" })
		.where(
			and(
				eq(files.id, fileId),
				eq(files.userId, session.user.id!)
			)
		);

	return json({ success: true });
};