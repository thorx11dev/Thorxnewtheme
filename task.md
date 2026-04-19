# Task: Enterprise Auth Hardening & Recovery Audit

## Phase A: Schema Expansion
- [x] Step 1: Add `emailVerifiedAt` timestamp to users schema
- [x] Step 2: Add `device_fingerprints` table (user_id, fingerprint, last_seen_at)
- [x] Step 3: Run `npx drizzle-kit push`
- [x] Step 4: Update `server/storage.ts` logic to include new fields

## Phase B: Security Gates (Backend)
- [x] Step 5: Update `/api/register` to save device fingerprint
- [x] Step 6: Ensure 2-account per device limit during registration
- [x] Step 7: Update `/api/login` to intercept `emailVerifiedAt === null`
- [x] Step 8: Exclude specific roles (team, admin, founder) from OTP lock
- [x] Step 9: Save login device fingerprint

## Phase C: OTP Verification UI (Frontend)
- [x] Step 10: State Machine update in `client/src/pages/auth.tsx`
- [x] Step 11: Add 6-digit split input UI
- [x] Step 12: Wire input to `insforge.auth.verifyEmail`
- [x] Step 13: Wire resend timer and `insforge.auth.resendVerificationEmail`
- [x] Step 14: Mark account verified upon success

## Phase D: Forgot Password Recovery Flow (Frontend)
- [x] Step 15: Create 3-step Password Recovery UI
- [x] Step 16: Step 1 -> `sendResetPasswordEmail`
- [x] Step 17: Step 2 -> Reuse OTP UI with `exchangeResetPasswordToken`
- [x] Step 18: Step 3 -> New Password Input -> `resetPassword`

## Phase E: Legacy User Migration (Frontend & Backend)
- [x] Step 19: Check local DB if `signInWithPassword` fails
- [x] Step 20: Prompt legacy users to re-register with same email to migrate

## Phase F: Anti-Abuse (Frontend)
- [x] Step 21: Integrate client-side device fingerprint generator
- [x] Step 22: Pass `deviceFingerprint` hash to login and register API calls

## Phase G: Polish & QA
- [x] Step 23: Run TypeScript compiler check
- [x] Step 24: Test authentication flows
- [x] Step 25: Build project and verify
