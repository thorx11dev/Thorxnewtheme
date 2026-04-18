import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derive a 256-bit key from the app secret.
 * Uses scrypt with a per-encryption salt for key derivation.
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32);
}

/**
 * Returns the encryption secret from env.
 * Falls back to SESSION_SECRET if CREDENTIAL_ENCRYPTION_KEY is not set.
 */
function getSecret(): string {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.SESSION_SECRET || "";
  if (!key) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY or SESSION_SECRET must be set for credential encryption");
  }
  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a hex-encoded string: salt + iv + authTag + ciphertext
 */
export function encryptCredential(plaintext: string): string {
  const secret = getSecret();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: salt (32) + iv (16) + authTag (16) + ciphertext (variable)
  return Buffer.concat([salt, iv, authTag, encrypted]).toString("hex");
}

/**
 * Decrypt an AES-256-GCM encrypted hex string.
 * Returns the original plaintext.
 */
export function decryptCredential(encryptedHex: string): string {
  const secret = getSecret();
  const data = Buffer.from(encryptedHex, "hex");

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(secret, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}

/**
 * Check if a string looks like it's already encrypted (hex-encoded, minimum length).
 * Used to avoid double-encrypting during migration.
 */
export function isEncrypted(value: string): boolean {
  const minHexLength = (SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) * 2; // minimum: 1 byte ciphertext
  return /^[0-9a-f]+$/i.test(value) && value.length >= minHexLength;
}
