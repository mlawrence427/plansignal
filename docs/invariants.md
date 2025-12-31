# PlanSignal Invariants

## What PlanSignal Does

1. **Stores plan assignment facts.** Each fact contains: subject, scope, plan_id, origin, reason, policy_version, effective_at, and expires_at.

2. **Emits plan state at read-time.** Given a subject, scope, and evaluation timestamp, PlanSignal returns the applicable plan state.

3. **Resolves temporal state deterministically.** The same inputs always produce the same output. State is one of: `active`, `expired`, or `none`.

4. **Returns provenance.** Each state response includes origin, reason, and policy_version from the underlying fact.

5. **Validates input shape.** The emit endpoint validates that required fields are present and correctly typed.

## What PlanSignal Does Not Do

1. **Does not enforce access.** PlanSignal emits state. Enforcement is the responsibility of downstream systems.

2. **Does not interpret business rules.** PlanSignal does not know what "pro" or "enterprise" means. It stores and emits plan identifiers without interpretation.

3. **Does not authenticate users.** Subject identifiers are opaque strings. PlanSignal does not verify identity.

4. **Does not authorize actions.** PlanSignal does not decide what actions a plan permits. That logic belongs downstream.

5. **Does not perform background jobs.** All computation happens at request time. There are no workers, schedulers, or async processes.

6. **Does not validate billing.** PlanSignal does not verify payment status or interact with payment systems.

7. **Does not call external services.** PlanSignal has no outbound network calls. It reads from and writes to its database only.

8. **Does not send webhooks.** There are no event notifications. Downstream systems poll for state.

9. **Does not expire plans automatically.** Expiration is evaluated at read-time. No background process mutates state.

## Resolution Rules

1. Find the most recent plan assignment where `effective_at <= evaluated_at`.
2. If `expires_at` is non-null and `expires_at < evaluated_at`, state is `expired`.
3. If `expires_at` is null or `expires_at >= evaluated_at`, state is `active`.
4. If no matching assignment exists, state is `none`.
