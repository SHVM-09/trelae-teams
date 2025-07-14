import { db } from "$lib/server/db";
import { invites, users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

export const load = async ({ cookies }) => {
    const token = cookies.get("invite_token");
    if (token) {
      const invite = await db.query.invites.findFirst({
        where: (i, { eq }) => eq(i.token, token)
      });
      console.log("Invite:", invite);

      if (invite) {
        await db.update(users)
          .set({
            teamId: invite.teamId,
            teamNamespaceId: invite.teamNamespaceId,
            publicNamespaceId: invite.publicNamespaceId
          })
          .where(eq(users.email, invite.email));

        // delete the invite after use
        await db.delete(invites).where(eq(invites.id, invite.id));
      }

      cookies.delete("invite_token", { path: "/" });
    }

  return;
};