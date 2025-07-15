import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/core/providers/google";
import { env } from "$env/dynamic/private";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { randomUUID } from "crypto";
import { trelae } from '$lib/trelae';

export const handle = SvelteKitAuth({
	providers: [
		Google({
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		}),
	],
	secret: env.AUTH_SECRET,

	callbacks: {
		// Runs on every sign in
		async signIn({ user }) {
			const email = user?.email;
			const googleId = user?.id;

			if (!email || !googleId) return false;

			const existing = await db.query.users.findFirst({
				where: (u, { or, eq }) => or(eq(u.googleId, googleId), eq(u.email, email)),
			});


			// If new user — insert with ALL schema fields.

			if (!existing) {

				// create personal `namespace` for the user
				const namespace = await trelae.createNamespace({
					name: `pns-${googleId}`,
					region: 'us-east-1',
					isPublic: false
				});

				if (!namespace) {
					throw new Error("Failed to create namespace");
				}

				const namespaceId = namespace.getId();
				await db.insert(users).values({
					id: randomUUID(),
					email: email,
					googleId: googleId,
					name: user.name ?? null,
					avatarUrl: user.image ?? null,
					role: "member",
					teamId: null,
					namespaceId,
					createdAt: new Date(), // drizzle `timestamp` is Date type
				});
			}

			return true;
		},

		// Attach extra fields to session if you want
		async session({ session }) {
			if (!session.user?.email) return session;

			const dbUser = await db.query.users.findFirst({
				where: (u, { eq }) => eq(u.email, session.user?.email ?? ""),
			});

			if (dbUser && session.user) {
				session.user.id = dbUser.id;
        		// @ts-expect-error
				session.user.role = dbUser.role;
        		// @ts-expect-error
				session.user.teamId = dbUser.teamId;
        		// @ts-expect-error
				session.user.avatarUrl = dbUser.avatarUrl;
				session.user.name = dbUser.name;
				// @ts-expect-error
				session.user.namespaceId = dbUser.namespaceId;
				// @ts-expect-error
				session.user.teamNamespaceId = dbUser.teamNamespaceId;
				// @ts-expect-error
				session.user.publicNamespaceId = dbUser.publicNamespaceId;
				// createdAt is optional for frontend — you can include if needed
			}

			return session;
		},

		// Always redirect to dashboard
		async redirect({ baseUrl }) {
			return `${baseUrl}/dashboard`;
		},
	},
}).handle;