// api/download/+server.ts// src/routes/public/download/+server.ts
import { json, redirect } from "@sveltejs/kit";
import { db }              from "$lib/server/db";
import { files as filesTbl }from "$lib/server/db/schema";
import { eq }              from "drizzle-orm";
import { trelae }          from "$lib/trelae";

export const GET = async ({ url }) => {
	const fileId = url.searchParams.get("fileId");
	if (!fileId) {
		return new Response("Missing fileId", { status: 400 });
	}

	const [fileRow] = await db
		.select()
		.from(filesTbl)
		.where(eq(filesTbl.id, fileId));

	if (!fileRow || fileRow.visibility !== "public") {
		return new Response("File not found", { status: 404 });
	}

	const signedUrl: string = await trelae
		.file(fileId)
        // @ts-expect-error – underlying SDK type
		.getDownloadUrl({ expire: "1h" });      // 1-hour expiry

	const mode = url.searchParams.get("as");
	if (mode === "redirect") {
		throw redirect(302, signedUrl);
	}

	return json({ url: signedUrl });
};