import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { teams } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';

export const POST = async ({ request, cookies }) => {
	const { teamId, password } = await request.json();

	if (!teamId || !password) {
		return new Response('Missing teamId or password', { status: 400 });
	}

	const [team] = await db.select().from(teams).where(eq(teams.id, teamId));

	if (!team || !team.publicPassword) {
		return new Response('Unauthorized', { status: 401 });
	}

	const isValid = await compare(password, team.publicPassword);
	if (!isValid) {
		return new Response('Invalid password', { status: 401 });
	}

	// ✅ Set cookies on successful access
	cookies.set('public_access', 'true', {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	cookies.set('public_team_id', teamId, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	return json({ success: true });
};