# PlanSignal Non-Capabilities

PlanSignal does not do the following.

## Authentication

PlanSignal does not authenticate users. Subject identifiers are accepted as opaque strings. The system that calls PlanSignal is responsible for verifying user identity before making requests.

## Authorization

PlanSignal does not authorize actions. It does not know what a user is allowed to do. It only reports what plan a subject is assigned to. Authorization decisions belong to the consuming system.

## Access Enforcement

PlanSignal does not enforce access. If a plan has expired, PlanSignal reports `state: "expired"`. It does not block requests or revoke tokens. Enforcement is the caller's responsibility.

## Business Rule Interpretation

PlanSignal does not interpret plan semantics. It does not know what features "pro" includes or what limits "starter" imposes. Plan identifiers are opaque strings.

## Billing Validation

PlanSignal does not validate billing status. It does not communicate with payment processors. It does not verify that a plan assignment corresponds to a valid payment.

## Background Processing

PlanSignal does not run background jobs. There are no workers, cron tasks, or scheduled processes. All computation occurs at request time.

## External Service Calls

PlanSignal does not call external services. It has no outbound HTTP requests. It reads from and writes to its own database only.

## Webhooks

PlanSignal does not send webhooks. There are no event notifications. Consumers must poll the state endpoint.

## Automatic Expiration

PlanSignal does not automatically expire plans. The `expires_at` field is evaluated at read-time. No background process updates or deletes records.

## Dashboards

PlanSignal does not provide a dashboard. There is no admin UI. Operators interact via API or direct database access.

## Caching

PlanSignal does not cache responses. Each request queries the database. Caching, if needed, is the responsibility of the calling system.

## Rate Limiting

PlanSignal does not rate limit requests. If rate limiting is required, it must be implemented upstream.

## Logging Beyond Errors

PlanSignal logs errors to stderr. It does not provide structured audit logs or analytics. Audit logging is the caller's responsibility.
