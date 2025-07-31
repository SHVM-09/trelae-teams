// src/routes/api/team/leave/+server.ts
import { json } from "@sveltejs/kit";
import { db }     from "$lib/server/db";
import { users }  from "$lib/server/db/schema";
import { eq }     from "drizzle-orm";

export const POST = async ({ locals }) => {
  /* 1 ▸ require auth */
  const session = await locals.auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  /* 2 ▸ fetch user */
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  /* 3 ▸ basic guards */
  if (!user.teamId) {
    return new Response("You’re not on a team", { status: 400 });
  }

  if (user.role === "admin") {
    return new Response(
      "Admins can’t leave the team directly — they must delete the plan instead.",
      { status: 403 }
    );
  }

  /* 4 ▸ remove the user from the team */
  await db
    .update(users)
    .set({
      teamId:            null,
      role:              "member",
      teamNamespaceId:   null,
      publicNamespaceId: null
    })
    .where(eq(users.id, user.id));

  return json({ success: true });
};