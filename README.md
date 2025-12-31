# PlanSignal

SimpleStates — PlanSignal

Emits plan and entitlement state at read-time.

## What PlanSignal Does

- Stores plan assignment facts
- Emits deterministic plan state at read-time
- Preserves provenance (origin, reason, policy_version)

## What PlanSignal Does Not Do

- Does not enforce access
- Does not interpret business rules
- Does not authenticate users
- Does not authorize actions
- Does not run background jobs
- Does not call external services

PlanSignal is a signal-only state source.

## Setup

```bash
# Install dependencies
npm install

# Initialize database
createdb plansignal
npm run db:init

# Start server
npm run dev
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://localhost:5432/plansignal | PostgreSQL connection string |
| PORT | 3000 | HTTP server port |

## API

### POST /emit/plan

Store a plan assignment fact.

```json
{
  "subject": "user:12345",
  "scope": "billing",
  "plan_id": "pro_monthly",
  "origin": "stripe_webhook",
  "reason": "subscription_created",
  "policy_version": "v2024.1",
  "effective_at": "2024-01-01T00:00:00Z",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### GET /state/plan

Read plan state.

```
GET /state/plan?subject=user:12345&scope=billing&evaluated_at=2024-06-15T00:00:00Z
```

Response:

```json
{
  "state": "active",
  "plan": "pro_monthly",
  "evaluated_at": "2024-06-15T00:00:00.000Z",
  "provenance": {
    "origin": "stripe_webhook",
    "reason": "subscription_created",
    "policy_version": "v2024.1"
  }
}
```

## Documentation

- [Invariants](docs/invariants.md)
- [Non-Capabilities](docs/non-capabilities.md)
- [Datasheet](docs/datasheet.md)

## Testing

```bash
# Create test database
createdb plansignal_test

# Run golden tests
DATABASE_URL=postgresql://localhost:5432/plansignal_test npm test
```

