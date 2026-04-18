import { db } from "../server/db";
import { users, teamKeys } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

/**
 * Seeds a founder row in Postgres. The `id` must match the Insforge Auth user id
 * for that email (create the user in Insforge first, then set FOUNDER_USER_ID).
 */
async function createFounder() {
  const email = process.env.FOUNDER_EMAIL || "founder@thorx.com";
  const password = process.env.FOUNDER_PASSWORD || "Admin123!";
  const firstName = "Thorx";
  const lastName = "Founder";
  const userId = process.env.FOUNDER_USER_ID || randomUUID();

  console.log(`Seeding founder for ${email} with id ${userId}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!existingUser) {
      await db.insert(users).values({
        id: userId,
        firstName,
        lastName,
        identity: "THORX_FOUNDER_CORE",
        phone: "+15550000000",
        email,
        passwordHash: hashedPassword,
        referralCode: "THORX-FOUNDER",
        role: "founder",
        isActive: true,
        isVerified: true,
      });
      console.log("Founder user row created.");
    } else {
      await db
        .update(users)
        .set({
          role: "founder",
          passwordHash: hashedPassword,
        })
        .where(eq(users.email, email));
      console.log("Existing user promoted to founder (password and role updated).");
    }

    const effectiveId =
      (await db.query.users.findFirst({ where: eq(users.email, email) }))?.id || userId;

    const existingKey = await db.query.teamKeys.findFirst({
      where: eq(teamKeys.userId, effectiveId),
    });

    if (!existingKey) {
      await db.insert(teamKeys).values({
        userId: effectiveId,
        keyName: "Master Founder Key",
        accessLevel: "founder",
        permissions: ["all"],
        isActive: true,
      });
      console.log("Master Team Key assigned.");
    } else {
      await db
        .update(teamKeys)
        .set({ accessLevel: "founder", isActive: true })
        .where(eq(teamKeys.userId, effectiveId));
      console.log("Team Key updated to founder level.");
    }

    console.log("\nSUCCESS: Founder row is ready in Postgres.");
    console.log("Ensure Insforge Auth has a user with this id and email for login:", effectiveId, email);
  } catch (error) {
    console.error("FATAL ERROR creating founder:", error);
  } finally {
    process.exit(0);
  }
}

createFounder();
