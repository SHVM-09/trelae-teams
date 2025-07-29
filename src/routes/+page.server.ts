import type {PageServerLoad} from "./$types";

// Match +page.svelte usage
export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	return {
		data: {
			session: session ?? null
		}
	};
};