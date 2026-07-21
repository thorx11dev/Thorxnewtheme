#!/usr/bin/env bash
# ============================================================
# THORX – Auth flow verification script
# Tests: register, login, session, logout, wrong-password
# Usage:  bash scripts/verify-auth.sh
# Requires: app running on $REPLIT_DEV_DOMAIN (or PORT 5000)
# ============================================================
set -euo pipefail

BASE_URL="${REPLIT_DEV_DOMAIN:+https://$REPLIT_DEV_DOMAIN}"
BASE_URL="${BASE_URL:-http://localhost:5000}"
COOKIE_JAR=$(mktemp)
PASS=0; FAIL=0

check() {
  local label="$1"; local expected="$2"; local actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  ✅  $label"
    PASS=$((PASS+1))
  else
    echo "  ❌  $label  (expected '$expected' in: $actual)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== THORX Auth Verification ==="
echo "Target: $BASE_URL"
echo ""

# ---------- seed CSRF cookie ----------
curl -s -c "$COOKIE_JAR" "$BASE_URL/api/health" -o /dev/null
CSRF=$(grep "thorx.csrf.v2" "$COOKIE_JAR" | awk '{print $NF}')
check "CSRF cookie set" "." "$CSRF"

# ---------- register new user ----------
REG=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -d "{\"firstName\":\"Verify\",\"lastName\":\"Test\",\"email\":\"verify_test_$(date +%s)@example.com\",\"password\":\"TestPass123!\",\"phone\":\"+9991234567\",\"identity\":\"VT-$(date +%s)\"}")
check "Registration succeeds" '"success":true' "$REG"

# ---------- login with founder account ----------
LOGIN=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -d '{"email":"thorx11dev@gmail.com","password":"Aonimran777!"}')
check "Founder login succeeds" '"role":"founder"' "$LOGIN"

# ---------- session persists ----------
SESSION=$(curl -s "$BASE_URL/api/user" \
  -H "x-csrf-token: $CSRF" \
  -b "$COOKIE_JAR")
check "Session persists after login" '"role":"founder"' "$SESSION"

# ---------- wrong password rejected ----------
BAD=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b "$COOKIE_JAR" \
  -d '{"email":"thorx11dev@gmail.com","password":"WRONG_PASSWORD"}')
check "Wrong password rejected" 'UNAUTHORIZED' "$BAD"

# ---------- logout ----------
LOGOUT=$(curl -s -X POST "$BASE_URL/api/logout" \
  -H "x-csrf-token: $CSRF" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR")
check "Logout succeeds" '"success":true' "$LOGOUT"

# ---------- post-logout session destroyed ----------
CSRF2=$(grep "thorx.csrf.v2" "$COOKIE_JAR" | awk '{print $NF}')
AFTER=$(curl -s "$BASE_URL/api/user" \
  -H "x-csrf-token: $CSRF2" \
  -b "$COOKIE_JAR")
check "Session destroyed after logout" 'NO_SESSION' "$AFTER"

rm -f "$COOKIE_JAR"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "✅ All checks passed." && exit 0
echo "❌ Some checks failed." && exit 1
