---
name: Dual validation guards
description: Routes that have a manual required-field presence check AND a separate zod schema validation must have both updated in lockstep.
---

Some Express routes check required fields manually (e.g. `if (!firstName || !lastName || ...)`) before also running a zod schema (`registerSchema.safeParse(...)`). These are two independent gates.

**Why:** When a field's validation is relaxed only in the zod schema (e.g. making `lastName` optional/default `""` to support single-word names), the manual truthy-check upstream still rejects a valid empty string, since `!""` is `true`. This silently reintroduces the bug the schema change was meant to fix — the request never reaches the schema at all.

**How to apply:** When relaxing a field's validation, grep the same route for any earlier manual presence/truthy checks on that field and update them to match (e.g. check `=== undefined`/`=== null` instead of falsy) before relying on the schema alone.
