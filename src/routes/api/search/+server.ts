import { json } from '@sveltejs/kit';
import { trelae } from '$lib/trelae';

export const GET = async ({ url }) => {
	const query = url.searchParams.get('q');
	const visibility = url.searchParams.get('visibility') ?? 'private';

	if (!query) {
		return json({ files: [], folders: [] });
	}

	// Pick correct namespace
	const namespaceId =
		visibility === 'team'
			? process.env.TRELAE_TEAM_NAMESPACE_ID!
			: visibility === 'public'
				? process.env.TRELAE_PUBLIC_NAMESPACE_ID!
				: process.env.TRELAE_NAMESPACE_ID!;

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