// api/download/+server.ts// src/routes/public/download/+server.ts
import { json, redirect } from "@sveltejs/kit";
import { db }              from "$lib/server/db";
import { files as filesTbl }from "$lib/server/db/schema";
import { eq }              from "drizzle-orm";
import { trelae }          from "$lib/trelae";

/**
 * GET  /public/download?fileId=<uuid>&as=json
 *
 * • Generates a 1-hour signed Trelae download URL for a file whose visibility is `public`.
 * • No user session is required.
 * • Returns JSON (`{ url }`) by default; pass `&as=redirect` to 302-redirect straight to the file.
 */
export const GET = async ({ url }) => {
	/* ------------------------------------------------------------------ */
	/* 1. Validate query params                                           */
	/* ------------------------------------------------------------------ */
	const fileId = url.searchParams.get("fileId");
	if (!fileId) {
		return new Response("Missing fileId", { status: 400 });
	}

	/* ------------------------------------------------------------------ */
	/* 2. Make sure the file exists and is public                         */
	/* ------------------------------------------------------------------ */
	const [fileRow] = await db
		.select()
		.from(filesTbl)
		.where(eq(filesTbl.id, fileId));

	if (!fileRow || fileRow.visibility !== "public") {
		return new Response("File not found", { status: 404 });
	}

	/* ------------------------------------------------------------------ */
	/* 3. Create a signed download URL via Trelae                         */
	/* ------------------------------------------------------------------ */
	const signedUrl: string = await trelae
		.file(fileId)
        // @ts-expect-error – underlying SDK type
		.getDownloadUrl({ expire: "1h" });      // 1-hour expiry

	/* ------------------------------------------------------------------ */
	/* 4. Respond (JSON or Redirect)                                      */
	/* ------------------------------------------------------------------ */
	const mode = url.searchParams.get("as");
	if (mode === "redirect") {
		throw redirect(302, signedUrl);
	}

	return json({ url: signedUrl });
};