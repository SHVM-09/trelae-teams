import { redirect } from "@sveltejs/kit";

export const load = async (event: any) => {
    const session = await event.locals.getSession();

    if (!session) {
        throw redirect(302, "/login");
    }

    return { session };
};
