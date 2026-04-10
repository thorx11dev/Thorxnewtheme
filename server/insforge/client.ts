type InsforgeMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const INSFORGE_API_URL = process.env.INSFORGE_API_URL || "";
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY || "";

export async function insforgeRequest<T>(
  method: InsforgeMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  if (!INSFORGE_API_URL) {
    throw new Error("INSFORGE_API_URL is not configured");
  }

  const url = path.startsWith("/") ? `${INSFORGE_API_URL}${path}` : `${INSFORGE_API_URL}/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(INSFORGE_API_KEY ? { "Authorization": `Bearer ${INSFORGE_API_KEY}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insforge request failed (${res.status}): ${text}`);
  }

  return (await res.json()) as T;
}
