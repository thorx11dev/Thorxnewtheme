import { compressProfileImage } from "./compress-image";

const MAX_PROFILE_BYTES = 5 * 1024 * 1024;

export function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
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

/**
 * Process a profile picture payload for local storage.
 * - undefined → no change
 * - null / "" → clear
 * - https URL → store as-is
 * - data URL → compress with sharp, store as base64 data URL in DB
 */
export async function processProfilePicture(
  incoming: string | null | undefined,
): Promise<string | null | undefined> {
  if (incoming === undefined) return undefined;
  if (incoming === null || incoming === "") return null;

  const trimmed = incoming.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const decoded = decodeDataUrl(trimmed);
  if (!decoded) {
    throw new Error("Invalid profile picture data (expected a data URL or https URL)");
  }

  const compressed = await compressProfileImage(decoded.buffer, decoded.contentType);
  const b64 = compressed.buffer.toString("base64");
  return `data:${compressed.contentType};base64,${b64}`;
}
