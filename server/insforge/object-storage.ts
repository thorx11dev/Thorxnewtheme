import { randomUUID } from "node:crypto";

/** Default bucket created for THORX on Insforge Cloud (override with INSFORGE_STORAGE_BUCKET). */
export function defaultStorageBucket(): string {
  return (process.env.INSFORGE_STORAGE_BUCKET || "thorx-assets").trim();
}

export function insforgeApiBase(): string {
  return (process.env.INSFORGE_API_URL || "").replace(/\/$/, "");
}

function baseUrl(): string {
  return insforgeApiBase();
}

function apiKey(): string {
  return (process.env.INSFORGE_API_KEY || "").trim();
}

function adminAuthHeaders(): HeadersInit {
  const k = apiKey();
  if (!k) return {};
  return { Authorization: `Bearer ${k}` };
}

export interface UploadedObjectMeta {
  bucket: string;
  key: string;
  url: string;
}

/**
 * Upload bytes to Insforge Storage (REST: PUT /api/storage/buckets/{bucket}/objects/{key}).
 * Requires INSFORGE_API_URL + INSFORGE_API_KEY (service / admin key).
 */
export async function putBucketObject(
  bucket: string,
  objectKey: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadedObjectMeta> {
  const b = baseUrl();
  const k = apiKey();
  if (!b || !k) {
    throw new Error("INSFORGE_API_URL and INSFORGE_API_KEY are required for object storage uploads");
  }

  const safeKey = objectKey.replace(/^\/+/, "");
  const url = `${b}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/${safeKey}`;

  const form = new FormData();
  const filename = safeKey.split("/").pop() || "upload";
  form.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);

  const res = await fetch(url, {
    method: "PUT",
    headers: adminAuthHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insforge storage upload failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { bucket: string; key: string; url: string };
  const absoluteUrl =
    json.url && json.url.startsWith("http")
      ? json.url
      : `${b}${json.url.startsWith("/") ? "" : "/"}${json.url}`;
  return { bucket: json.bucket, key: json.key, url: absoluteUrl };
}

export async function deleteBucketObject(bucket: string, objectKey: string): Promise<void> {
  const b = baseUrl();
  const k = apiKey();
  if (!b || !k) return;

  const safeKey = objectKey.replace(/^\/+/, "");
  const url = `${b}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/${safeKey}`;
  const res = await fetch(url, { method: "DELETE", headers: adminAuthHeaders() });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.warn(`Insforge storage delete (${res.status}): ${text}`);
  }
}

/** Parse an object URL returned by Insforge after upload. */
export function parseInsforgeStorageObjectRef(
  profileUrl: string,
): { bucket: string; objectKey: string } | null {
  try {
    const u = profileUrl.startsWith("http")
      ? new URL(profileUrl)
      : new URL(profileUrl, "https://placeholder.invalid");
    const m = u.pathname.match(/^\/api\/storage\/buckets\/([^/]+)\/objects\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], objectKey: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

export async function deleteProfileObjectIfManaged(profileUrl: string | null | undefined): Promise<void> {
  if (!profileUrl) return;
  let candidate = profileUrl;
  try {
    if (profileUrl.includes("/api/thorx/storage-proxy")) {
      const u = new URL(profileUrl, "https://thorx.invalid");
      const inner = u.searchParams.get("u");
      if (inner) candidate = decodeURIComponent(inner);
    }
  } catch {
    /* ignore */
  }
  const ref = parseInsforgeStorageObjectRef(candidate);
  if (!ref) return;
  await deleteBucketObject(ref.bucket, ref.objectKey);
}

const MAX_PROFILE_BYTES = 5 * 1024 * 1024;

export function decodeDataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const contentType = m[1]?.trim() || "application/octet-stream";
  const b64 = m[2]?.replace(/\s/g, "") || "";
  try {
    const buffer = Buffer.from(b64, "base64");
    if (buffer.length > MAX_PROFILE_BYTES) {
      throw new Error(`Profile image exceeds ${Math.floor(MAX_PROFILE_BYTES / (1024 * 1024))}MB`);
    }
    if (!contentType.startsWith("image/")) {
      throw new Error("Profile picture must be an image");
    }
    return { buffer, contentType };
  } catch (e) {
    if (e instanceof Error && (e.message.includes("exceeds") || e.message.includes("must be an image"))) {
      throw e;
    }
    return null;
  }
}

function safeOwnerSegment(ownerId: string): string {
  return ownerId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

/**
 * Turn a client payload (data URL, https URL, null, or undefined) into what we persist on the user row.
 * - `undefined`: do not change the column.
 * - `null` / empty: clear picture; delete prior managed object if any.
 * - `https?`: store as-is; delete prior managed object if replaced.
 * - `data:image/...;base64,...`: upload to Insforge bucket, store returned URL; delete prior managed object.
 */
export async function persistProfilePicturePayload(
  ownerId: string,
  incoming: string | null | undefined,
  previous: string | null | undefined,
): Promise<string | null | undefined> {
  if (incoming === undefined) {
    return undefined;
  }
  if (incoming === null || incoming === "") {
    if (previous) await deleteProfileObjectIfManaged(previous);
    return null;
  }

  const trimmed = incoming.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (previous && previous !== trimmed) {
      await deleteProfileObjectIfManaged(previous);
    }
    return trimmed;
  }

  const decoded = decodeDataUrlToBuffer(trimmed);
  if (!decoded) {
    throw new Error("Invalid profile picture data (expected a data URL or https URL)");
  }

  const bucket = defaultStorageBucket();
  const ext =
    decoded.contentType.includes("png") ? "png" : decoded.contentType.includes("webp") ? "webp" : "jpg";
  const objectKey = `profiles/${safeOwnerSegment(ownerId)}/${randomUUID()}.${ext}`;
  const uploaded = await putBucketObject(bucket, objectKey, decoded.buffer, decoded.contentType);

  if (previous) await deleteProfileObjectIfManaged(previous);

  return wrapProfilePictureUrlForClients(uploaded.url);
}

/**
 * When the bucket is private, browsers cannot load Insforge object URLs without auth.
 * Set THORX_PUBLIC_API_URL (e.g. https://api.yourdomain.com) so we store a same-API URL that
 * streams via GET /api/thorx/storage-proxy. If INSFORGE_STORAGE_PUBLIC_READ=true, the raw
 * Insforge URL is returned instead.
 */
export function wrapProfilePictureUrlForClients(insforgeObjectUrl: string): string {
  if (process.env.INSFORGE_STORAGE_PUBLIC_READ === "true") {
    return insforgeObjectUrl;
  }
  const pub = (process.env.THORX_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (!pub) {
    return insforgeObjectUrl;
  }
  if (!/^https?:\/\//i.test(pub)) {
    console.warn(
      "[THORX] THORX_PUBLIC_API_URL must be an absolute https?:// URL for the storage proxy. Using raw Insforge object URL (private buckets may not render in the browser).",
    );
    return insforgeObjectUrl;
  }
  if (!insforgeObjectUrl.startsWith("http://") && !insforgeObjectUrl.startsWith("https://")) {
    console.warn("[THORX] Expected absolute Insforge object URL after upload; skipping proxy wrap.");
    return insforgeObjectUrl;
  }
  return `${pub}/api/thorx/storage-proxy?u=${encodeURIComponent(insforgeObjectUrl)}`;
}
