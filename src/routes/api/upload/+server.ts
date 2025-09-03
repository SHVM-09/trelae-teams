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

// Threshold for multipart (5 MB)
const FIVE_MB = 5 * 1024 * 1024;

export const POST = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const body = await request.json();
	const filename: string | undefined = body?.filename;
	const visibility: "private" | "team" | "public" | undefined = body?.visibility;
	const location: string = body?.location ?? "";
	const dbType: string = body?.type ?? "file"; // your existing DB "type"
	const sizeNum: number = Number(body?.size ?? 0);
	const fileMime: string = body?.fileType || "application/octet-stream"; // NEW: MIME for multipart

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
	if (used + Number(sizeNum) > limit) {
		return new Response("Storage limit exceeded. Upgrade your plan to upload more files.", { status: 403 });
	}

	// ── Duplicate filename versioning (FIXED) ────────────────────────────────
	// We version based on ANY existing file in the same namespace + location,
	// not just the current user's files, so team/public namespaces never collide.
	const namespace = trelae.namespace(namespaceId);

	const originalParts = filename.split(".");
	const originalExt = originalParts.length > 1 ? originalParts.pop()! : "";
	const originalStem = originalParts.join(".");

	let suffix = 1;
	let nameToUse = filename;

	// Helper: does a file with this name already exist in this namespace+location?
	async function nameExistsInNamespace(name: string): Promise<boolean> {
	const rows = await db
		.select({ id: files.id })
		.from(files)
		.where(
		and(
			eq(files.namespaceId, namespaceId),
			eq(files.location, location),
			eq(files.name, name)
		)
		)
		.limit(1);
	return rows.length > 0;
	}

	// Loop until a unique name is found
	// (We rely on DB truth; remote listing is not needed and could miss >50 files.)
	while (await nameExistsInNamespace(nameToUse)) {
	if (originalExt) {
		nameToUse = `${originalStem}_v${++suffix}.${originalExt}`;
	} else {
		nameToUse = `${originalStem}_v${++suffix}`;
	}
	}

	// === Choose single vs multipart based on size ============================
	if (Number.isFinite(sizeNum) && sizeNum > 0 && sizeNum < FIVE_MB) {
		// Single PUT upload (existing behavior)
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
			type: dbType,
			size: Number(sizeNum) || 0,
			namespaceId: namespaceId,
			status: 'pending',
			visibility: visibility || "private",
		});

		return json({ uploadUrl, fileId: id, name: nameToUse });
	}

	// Multipart
	const start = await namespace.startMultipartUpload({
		name: nameToUse,
		location,
		size: Number(sizeNum),
		fileType: fileMime
	});
	// start: { id, uploadId, partSize, partCount, urls: [{partNumber,url}] }

	await db.insert(files).values({
		id: start.id,
		userId: session.user.id!,
		name: nameToUse,
		location,
		type: dbType,
		size: Number(sizeNum) || 0,
		namespaceId: namespaceId,
		status: 'pending',
		visibility: visibility || "private",
	});

	return json({
		fileId: start.id,
		uploadId: start.uploadId,
		partSize: start.partSize,
		partCount: start.partCount,
		urls: start.urls,
		name: nameToUse
	});
};

export const PUT = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	const { fileId, uploadId, parts } = await request.json();

	if (!fileId) return new Response("Missing fileId", { status: 400 });

	// Fetch file to assert ownership and get namespaceId
	const [record] = await db
		.select()
		.from(files)
		.where(and(eq(files.id, fileId), eq(files.userId, session.user.id!)));

	if (!record) return new Response("File not found", { status: 404 });

	// If multipart details present, complete multipart first
	if (uploadId && Array.isArray(parts) && parts.length > 0) {
		try {
			await trelae
				.namespace(record.namespaceId)
				.completeMultipartUpload({
					fileId,
					uploadId,
					parts // [{ partNumber, etag }]
				});
		} catch (err) {
			console.error('Multipart completion failed:', err);
			return new Response("Multipart completion failed", { status: 500 });
		}
	}

	// Mark uploaded (works for both single and multipart)
	await db
		.update(files)
		.set({ status: "uploaded" })
		.where(and(eq(files.id, fileId), eq(files.userId, session.user.id!)));

	return json({ success: true });
};