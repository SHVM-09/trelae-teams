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

	const results = await namespace.getFiles({
		query,
		limit: 50
	});

	const classified = await Promise.all(
		results.files.map(async (item) => {
			const id = item.getId();
			if (!id) return null;

			const trelaeFile = trelae.file(id);
			const meta = await trelaeFile.getMetaData();

			// Classify by trailing slash or size
			const isFolder = item.getName()?.endsWith('/') || meta.size === 0;

			return {
				id: id,
				name: item.getName(),
				location: item.getLocation(),
				createdAt: meta.createdAt,
				size: isFolder ? 0 : meta.size ?? 0,
				type: isFolder ? 'folder' : 'file'
			};
		})
	);

	const files = classified.filter((f) => f && f.type === 'file');
	const folders = classified.filter((f) => f && f.type === 'folder');

	console.log('Search results:', { files, folders });

	return json({ files, folders });
};