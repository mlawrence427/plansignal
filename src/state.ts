import pool from './db/pool';
import { PlanAssignmentRow, PlanStateResponse } from './types';

/**
 * Resolves plan state at a given evaluation time.
 * 
 * Resolution rules:
 * 1. Find the most recent plan assignment where effective_at <= evaluated_at
 * 2. If found and expires_at < evaluated_at → state = expired
 * 3. If found and (expires_at is null OR expires_at >= evaluated_at) → state = active
 * 4. If no assignment found → state = none
 * 
 * This function performs NO interpretation of plan semantics.
 * It only resolves temporal state.
 */
export async function resolvePlanState(
  subject: string,
  scope: string,
  evaluatedAt: Date
): Promise<PlanStateResponse> {
  const evaluatedAtISO = evaluatedAt.toISOString();

  const result = await pool.query<PlanAssignmentRow>(
    `SELECT * FROM plan_assignments
     WHERE subject = $1
       AND scope = $2
       AND effective_at <= $3
     ORDER BY effective_at DESC
     LIMIT 1`,
    [subject, scope, evaluatedAtISO]
  );

  if (result.rows.length === 0) {
    return {
      state: 'none',
      plan: null,
      evaluated_at: evaluatedAtISO,
      provenance: null,
    };
  }

  const row = result.rows[0];
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;

  let state: 'active' | 'expired';
  if (expiresAt !== null && expiresAt < evaluatedAt) {
    state = 'expired';
  } else {
    state = 'active';
  }

  return {
    state,
    plan: row.plan_id,
    evaluated_at: evaluatedAtISO,
    provenance: {
      origin: row.origin,
      reason: row.reason,
      policy_version: row.policy_version,
    },
  };
}
