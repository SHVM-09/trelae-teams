import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { files, teams, users } from "$lib/server/db/schema";
import { eq, sum, and, or } from "drizzle-orm";

// limits in bytes
const PLAN_LIMITS: Record<string, number> = {
  free: 5 * 1024 * 1024 * 1024,          // 5 GB
  basic: 50 * 1024 * 1024 * 1024,        // 50 GB
  pro: 500 * 1024 * 1024 * 1024,         // 500 GB
  enterprise: 1024 * 1024 * 1024 * 1024, // 1 TB
};

export const GET = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const user = session.user as {
    id: string;
    teamId?: string;
    namespaceId?: string;
    teamNamespaceId?: string;
    publicNamespaceId?: string;
  };
  let plan = "free";
  let used = 0;

  if (user.teamId) {
    // Team usage
    const [team] = await db.select().from(teams).where(eq(teams.id, user.teamId));
    plan = team?.plan ?? "free";

    const [result] = await db
      .select({ total: sum(files.size) })
      .from(files)
      .where(
        or(
          eq(files.namespaceId, user.teamNamespaceId!), // only team namespace
          eq(files.namespaceId, user.namespaceId!),
          eq(files.namespaceId, user.publicNamespaceId!)
        )
      );
      used = Number(result?.total ?? 0);
  } else {
    // Individual usage
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));

    plan = "free"; // expand later if individuals can have paid plans

    const [result] = await db
      .select({ total: sum(files.size) })
      .from(files)
      .where(
        or(
          eq(files.namespaceId, dbUser.namespaceId),
          eq(files.userId, dbUser.id)
        )
      );

    used = Number(result?.total ?? 0);
  }

  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  return json({
    used,
    limit,
    usedPercent: Math.min((used / limit) * 100, 100),
  });
};