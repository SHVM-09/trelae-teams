// src/routes/api/chat/clear/+server.ts
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { users, messages } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import "dotenv/config";

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL ?? "http://localhost:3001";

export const POST = async ({ locals, fetch }) => {
  // 1) Auth
  const session = await locals.auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // 2) Caller must be an admin on a team
  const [me] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!me?.teamId || me.role !== "admin") return new Response("Forbidden", { status: 403 });

  // 3) Room for this team
  const room = `team-${me.teamId}`;

  // 4) Delete all messages for this room
  const deleted = await db
    .delete(messages)
    .where(eq(messages.room, room))
    .returning({ id: messages.id }); // returning is handy to report how many

  // 5) Tell socket server to broadcast "chat:cleared" so clients wipe UI
  try {
    await fetch(`${SOCKET_SERVER_URL}/api/chat/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room })
    });
  } catch {
    // If socket server is down, deletion still succeeded
  }

  return json({ success: true, deletedCount: deleted.length });
};