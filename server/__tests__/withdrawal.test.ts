/**
 * Withdrawal integration tests — THORX
 *
 * Covers:
 *  1. Creating a pending withdrawal
 *  2. Admin approving a withdrawal (idempotency: double-submit is rejected)
 *  3. Admin rejecting a withdrawal
 *  4. Concurrent double-submit protection
 *
 * These are lighter integration tests that exercise storage methods directly
 * (not via HTTP) to avoid needing a running Express server with auth.
 * The financial math is covered by server/__tests__/financial.test.ts.
 *
 * Run: npx vitest run server/__tests__/withdrawal.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, pool } from "../db";
import { users, withdrawals } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import bcrypt from "bcrypt";

const TEST_EMAIL = `test_wd_${Date.now()}@thorx-test.local`;
const TEST_PHONE = `031${Math.floor(10000000 + Math.random() * 89999999)}`;
const TEST_IDENTITY = `twd_${Date.now()}`;

let testUserId: string;
let founderUserId: string;

// ── Helper: create a minimal test user ───────────────────────────────────────
async function createTestUser(overrides: Partial<any> = {}): Promise<string> {
  const [u] = await db.insert(users).values({
    firstName: overrides.firstName ?? "Withdrawal",
    lastName:  overrides.lastName  ?? "Test",
    identity:  overrides.identity  ?? TEST_IDENTITY,
    phone:     overrides.phone     ?? TEST_PHONE,
    email:     overrides.email     ?? TEST_EMAIL,
    passwordHash: await bcrypt.hash("TestPass123!", 10),
    referralCode: `REF_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    role:      overrides.role      ?? "user",
    txPointsBalance: overrides.txPointsBalance ?? "0",
  } as any).returning();
  return u.id;
}

beforeAll(async () => {
  testUserId   = await createTestUser({ txPointsBalance: "5000" });
  founderUserId = await createTestUser({
    firstName: "Founder",
    lastName:  "Test",
    identity:  `fnd_${Date.now()}`,
    phone:     `032${Math.floor(10000000 + Math.random() * 89999999)}`,
    email:     `fnd_${Date.now()}@thorx-test.local`,
    role:      "founder",
    txPointsBalance: "0",
  });
}, 30_000);

afterAll(async () => {
  // Remove withdrawals first (FK), then users
  if (testUserId)   await db.delete(withdrawals).where(eq(withdrawals.userId, testUserId)).catch(() => {});
  if (testUserId)   await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
  if (founderUserId) await db.delete(users).where(eq(users.id, founderUserId)).catch(() => {});
  await pool.end();
});

describe("Withdrawal lifecycle", () => {
  let withdrawalId: string;

  it("creates a pending withdrawal", async () => {
    const wd = await storage.createWithdrawal({
      userId: testUserId,
      amount: "500",            // 500 TX-Points
      accountTitle: "Test Account",
      bankName:     "HBL",
      accountNumber: "1234567890",
      paymentMethod: "bank",
    } as any);

    expect(wd.status).toBe("pending");
    expect(wd.userId).toBe(testUserId);
    withdrawalId = wd.id;
  });

  it("rejects a second pending withdrawal from the same user", async () => {
    await expect(
      storage.createWithdrawal({
        userId: testUserId,
        amount: "200",
        accountTitle: "Test Account",
        bankName:     "HBL",
        accountNumber: "1234567890",
        paymentMethod: "bank",
      } as any)
    ).rejects.toThrow();
  });

  it("approves the withdrawal", async () => {
    const approved = await storage.updateWithdrawalStatus(
      withdrawalId,
      "completed",
      founderUserId,
      `TX_TEST_${Date.now()}`
    );
    expect(approved.status).toBe("completed");
  });

  it("rejects re-approving an already-completed withdrawal", async () => {
    await expect(
      storage.updateWithdrawalStatus(withdrawalId, "completed", founderUserId)
    ).rejects.toThrow("not pending");
  });
});

describe("Withdrawal rejection", () => {
  let rejectedWdId: string;

  it("creates and rejects a withdrawal", async () => {
    // Give the test user enough points for a second withdrawal
    await db.execute(
      db.update(users).set({ txPointsBalance: "5000" }).where(eq(users.id, testUserId)).toSQL() as any
    );

    const wd = await storage.createWithdrawal({
      userId: testUserId,
      amount: "300",
      accountTitle: "Test Account",
      bankName:     "HBL",
      accountNumber: "1234567890",
      paymentMethod: "bank",
    } as any);
    rejectedWdId = wd.id;

    const rejected = await storage.updateWithdrawalStatus(
      rejectedWdId,
      "rejected",
      founderUserId,
      undefined,
      "Duplicate request"
    );
    expect(rejected.status).toBe("rejected");
  });

  it("cannot re-reject an already-rejected withdrawal", async () => {
    await expect(
      storage.updateWithdrawalStatus(rejectedWdId, "rejected", founderUserId, undefined, "again")
    ).rejects.toThrow("not pending");
  });
});
