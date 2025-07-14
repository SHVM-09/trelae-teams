import { redirect } from "@sveltejs/kit";

export const GET = async ({ cookies, url }) => {
	const token = url.searchParams.get("token");
	if (token) {
		cookies.set("invite_token", token, { path: "/", httpOnly: true });
	}
	return redirect(302, "/login");
};