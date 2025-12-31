# PlanSignal Datasheet

## Overview

PlanSignal is a plan state emission service. It stores plan assignment facts and emits deterministic plan state at read-time.

## Classification

- **Type:** State source
- **Mode:** Passive, signal-only
- **Evaluation:** Read-time

## Data Model

### Plan Assignment Fact

| Field | Type | Description |
|-------|------|-------------|
| subject | string | Opaque identifier for the entity (user, org, etc.) |
| scope | string | Namespace for plan assignments |
| plan_id | string | Opaque plan identifier |
| origin | string | Source of the assignment (e.g., "billing", "admin") |
| reason | string | Freeform explanation |
| policy_version | string | Opaque version passthrough |
| effective_at | timestamp | When the assignment becomes valid |
| expires_at | timestamp or null | When the assignment expires (null = no expiration) |

### Plan State Response

| Field | Type | Description |
|-------|------|-------------|
| state | "active" \| "expired" \| "none" | Resolved state |
| plan | string or null | Plan identifier if assignment exists |
| evaluated_at | timestamp | Time used for evaluation |
| provenance | object or null | Origin, reason, policy_version from assignment |

## API Surface

### POST /emit/plan

Persists a plan assignment fact.

**Request Body:** JSON matching Plan Assignment Fact schema.

**Response:** `200 OK` with `{ "ok": true }` on success.

**Behavior:** Validates shape. Persists fact. No side effects.

### GET /state/plan

Returns plan state for a subject/scope.

**Query Parameters:**
- `subject` (required): Subject identifier
- `scope` (required): Scope namespace
- `evaluated_at` (optional): ISO timestamp. Defaults to current time.

**Response:** JSON matching Plan State Response schema.

**Behavior:** Queries database. Evaluates temporal state. Returns deterministic result.

## Resolution Algorithm

1. Query plan_assignments where subject and scope match and effective_at <= evaluated_at.
2. Order by effective_at descending. Take first row.
3. If no row: state = "none", plan = null, provenance = null.
4. If row exists and expires_at < evaluated_at: state = "expired".
5. If row exists and (expires_at is null or expires_at >= evaluated_at): state = "active".
6. Return plan_id and provenance from row.

## Operational Characteristics

| Property | Value |
|----------|-------|
| Background jobs | None |
| External calls | None |
| Caching | None |
| Authentication | None (caller responsibility) |
| Authorization | None (caller responsibility) |
| Enforcement | None (caller responsibility) |

## Dependencies

- PostgreSQL database
- Node.js runtime

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://localhost:5432/plansignal | PostgreSQL connection string |
| PORT | 3000 | HTTP server port |
