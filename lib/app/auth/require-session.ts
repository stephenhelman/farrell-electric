import { auth } from "@/lib/app/auth";

/**
 * Rep server actions are reachable POST endpoints, so the layout/middleware
 * gate alone is not enough — every rep action calls this first. It is what
 * makes `source: "rep"` trustworthy: only an authenticated session can reach
 * a code path that stamps it.
 */
export async function requireRepSession(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return { userId: session.user.id };
}
