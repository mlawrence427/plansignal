/**
 * Plan assignment fact - stored at write-time
 */
export interface PlanAssignmentFact {
  subject: string;
  scope: string;
  plan_id: string;
  origin: string;
  reason: string;
  policy_version: string;
  effective_at: string;
  expires_at: string | null;
}

/**
 * Plan state response - computed at read-time
 */
export interface PlanStateResponse {
  state: 'active' | 'expired' | 'none';
  plan: string | null;
  evaluated_at: string;
  provenance: {
    origin: string;
    reason: string;
    policy_version: string;
  } | null;
}

/**
 * Database row representation
 */
export interface PlanAssignmentRow {
  id: number;
  subject: string;
  scope: string;
  plan_id: string;
  origin: string;
  reason: string;
  policy_version: string;
  effective_at: Date;
  expires_at: Date | null;
  created_at: Date;
}
