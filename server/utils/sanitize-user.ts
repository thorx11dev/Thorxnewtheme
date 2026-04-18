import type { User } from "@shared/schema";

/**
 * Strip sensitive internal fields before returning user data to the client.
 * NEVER send the raw Drizzle row — always pass through this function.
 */
export function sanitizeUser(user: User) {
  const { passwordHash, verificationToken, ...safe } = user;
  return safe;
}
