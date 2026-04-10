import admin, { adminAuth } from "../server/firebase-admin";
import { db } from "../server/db";
import { users, teamKeys } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createFounder() {
  const email = "founder@thorx.com";
  const password = "Admin123!";
  const firstName = "Thorx";
  const lastName = "Founder";

  console.log(`Starting creation of founder account for ${email}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create User in Firebase Auth
    let fbUser;
    try {
      fbUser = await adminAuth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
      console.log("Firebase user created successfully:", fbUser.uid);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        fbUser = await adminAuth.getUserByEmail(email);
        console.log("Firebase user already exists, reusing UID:", fbUser.uid);
      } else {
        throw error;
      }
    }

    // 2. Create User Profile in Local DB
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    let userId = fbUser.uid;
    if (!existingUser) {
      const [newUser] = await db.insert(users).values({
        id: fbUser.uid,
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
      }).returning();
      console.log("Local user profile created successfully.");
      userId = newUser.id;
    } else {
      await db.update(users)
        .set({ 
          role: "founder", 
          id: fbUser.uid,
          passwordHash: hashedPassword 
        })
        .where(eq(users.email, email));
      console.log("Existing local user profile updated to founder with synchronized hash.");
      userId = fbUser.uid;
    }

    // 3. Create Team Key for Access
    const existingKey = await db.query.teamKeys.findFirst({
      where: eq(teamKeys.userId, userId)
    });

    if (!existingKey) {
      await db.insert(teamKeys).values({
        userId: userId,
        keyName: "Master Founder Key",
        accessLevel: "founder",
        permissions: ["all"],
        isActive: true
      });
      console.log("Master Team Key assigned successfully.");
    } else {
      await db.update(teamKeys)
        .set({ accessLevel: "founder", isActive: true })
        .where(eq(teamKeys.userId, userId));
      console.log("Existing Team Key updated to founder level.");
    }

    console.log("\nSUCCESS: Founder account is ready.");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Role: founder (Full Admin Access)");
    
  } catch (error) {
    console.error("FATAL ERROR creating founder:", error);
  } finally {
    process.exit(0);
  }
}

createFounder();
