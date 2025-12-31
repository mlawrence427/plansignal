import { PlanAssignmentFact } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the shape of a plan assignment fact.
 * Does NOT interpret meaning or business rules.
 * Only validates presence and type of required fields.
 */
export function validatePlanAssignmentShape(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  const obj = body as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['subject', 'scope', 'plan_id', 'origin', 'reason', 'policy_version'];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== 'string') {
      errors.push(`Field '${field}' must be a string`);
    } else if (obj[field] === '') {
      errors.push(`Field '${field}' must not be empty`);
    }
  }

  // effective_at must be a valid ISO timestamp string
  if (typeof obj.effective_at !== 'string') {
    errors.push("Field 'effective_at' must be a string");
  } else {
    const parsed = Date.parse(obj.effective_at);
    if (isNaN(parsed)) {
      errors.push("Field 'effective_at' must be a valid ISO timestamp");
    }
  }

  // expires_at must be null or a valid ISO timestamp string
  if (obj.expires_at !== null && obj.expires_at !== undefined) {
    if (typeof obj.expires_at !== 'string') {
      errors.push("Field 'expires_at' must be a string or null");
    } else {
      const parsed = Date.parse(obj.expires_at);
      if (isNaN(parsed)) {
        errors.push("Field 'expires_at' must be a valid ISO timestamp or null");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Coerces a validated body into a PlanAssignmentFact.
 * Call only after validatePlanAssignmentShape returns valid: true.
 */
export function coercePlanAssignmentFact(body: Record<string, unknown>): PlanAssignmentFact {
  return {
    subject: body.subject as string,
    scope: body.scope as string,
    plan_id: body.plan_id as string,
    origin: body.origin as string,
    reason: body.reason as string,
    policy_version: body.policy_version as string,
    effective_at: body.effective_at as string,
    expires_at: (body.expires_at as string) ?? null,
  };
}
