import { json } from '@sveltejs/kit';
import { trelae } from '$lib/trelae';

export const GET = async ({ url, locals }) => {
	const query = url.searchParams.get('q');
	const visibility = url.searchParams.get('visibility') ?? 'private';
	const session = await locals.auth();
	if (!session?.user) return new Response("Unauthorized", { status: 401 });

	if (!query) {
		return json({ files: [], folders: [] });
	}

	if(!session.user.namespaceId && !session.user.teamNamespaceId && !session.user.publicNamespaceId) {
		return new Response("Namespace not configured for user", { status: 400 });
	}

	// Pick correct namespace
	const namespaceId =
		visibility === 'team'
			? session.user.teamNamespaceId
			: visibility === 'public'
				? session.user.publicNamespaceId
				: session.user.namespaceId;

	if (!namespaceId) {
		return new Response("Namespace ID is undefined", { status: 400 });
	}

	const namespace = trelae.namespace(namespaceId);

	const { files: rawFiles, folders: rawFolders } = await namespace.getFiles({
		query,
		limit: 50
	});

	// files: with metadata
	const files = await Promise.all(
		rawFiles.map(async (file) => {
			const id = file.getId();
			if (!id) return null;

			const meta = await trelae.file(id).getMetaData();

			return {
				id,
				name: file.getName(),
				location: file.getLocation(),
				createdAt: meta.createdAt,
				size: meta.size ?? 0,
				type: 'file'
			};
		})
	);

	// folders: with metadata
	const folders = await Promise.all(
		rawFolders.map(async (folder) => {
            // const id = folder.getId();
            // if (!id) return null;

			// const meta = await trelae.folder(id).getMetaData();
			return {
				id: folder.getId(),
				name: folder.getName(),
				location: folder.getLocation(),
				// createdAt: meta.createdAt,
				size: 0,
				type: 'folder'
			};
		})
	);

	return json({
		files: files.filter(Boolean),
		folders
	});
};