/**
 * Validates an Insforge access token and returns the auth user identity.
 * Used by the Express API so Thorx stays aligned with Insforge Auth.
 */
export type InsforgeAuthUser = { id: string; email?: string };

export async function fetchInsforgeSessionUser(accessToken: string): Promise<InsforgeAuthUser | null> {
  const base = (process.env.INSFORGE_API_URL || "").replace(/\/$/, "");
  if (!base || !accessToken) return null;

  try {
    const res = await fetch(`${base}/api/auth/sessions/current`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { user?: { id?: string; email?: string } };
    const id = body.user?.id;
    if (!id || typeof id !== "string") return null;
    return { id, email: body.user?.email };
  } catch {
    return null;
  }
}
