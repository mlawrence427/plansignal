import { Router, Request, Response } from 'express';
import pool from './db/pool';
import { validatePlanAssignmentShape, coercePlanAssignmentFact } from './validation';
import { resolvePlanState } from './state';

const router = Router();

/**
 * POST /emit/plan
 * 
 * Accepts a plan assignment fact and persists it.
 * Validates shape only. Does not interpret meaning.
 */
router.post('/emit/plan', async (req: Request, res: Response) => {
  const validation = validatePlanAssignmentShape(req.body);
  
  if (!validation.valid) {
    res.status(400).json({ error: 'Invalid request shape', details: validation.errors });
    return;
  }

  const fact = coercePlanAssignmentFact(req.body);

  try {
    await pool.query(
      `INSERT INTO plan_assignments 
       (subject, scope, plan_id, origin, reason, policy_version, effective_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        fact.subject,
        fact.scope,
        fact.plan_id,
        fact.origin,
        fact.reason,
        fact.policy_version,
        fact.effective_at,
        fact.expires_at,
      ]
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('emit/plan:', err);
    res.status(500).json({ error: 'persist failed' });
  }
});

/**
 * GET /state/plan
 * 
 * Reads plan state for a subject/scope at a given evaluation time.
 * If evaluated_at is omitted, uses current time.
 * Returns deterministic JSON state.
 */
router.get('/state/plan', async (req: Request, res: Response) => {
  const subject = req.query.subject;
  const scope = req.query.scope;
  const evaluatedAtParam = req.query.evaluated_at;

  if (typeof subject !== 'string' || subject === '') {
    res.status(400).json({ error: "Query parameter 'subject' is required" });
    return;
  }

  if (typeof scope !== 'string' || scope === '') {
    res.status(400).json({ error: "Query parameter 'scope' is required" });
    return;
  }

  let evaluatedAt: Date;
  if (evaluatedAtParam === undefined || evaluatedAtParam === '') {
    evaluatedAt = new Date();
  } else if (typeof evaluatedAtParam === 'string') {
    const parsed = Date.parse(evaluatedAtParam);
    if (isNaN(parsed)) {
      res.status(400).json({ error: "Query parameter 'evaluated_at' must be a valid ISO timestamp" });
      return;
    }
    evaluatedAt = new Date(parsed);
  } else {
    res.status(400).json({ error: "Query parameter 'evaluated_at' must be a string" });
    return;
  }

  try {
    const state = await resolvePlanState(subject, scope, evaluatedAt);
    res.status(200).json(state);
  } catch (err) {
    console.error('state/plan:', err);
    res.status(500).json({ error: 'resolve failed' });
  }
});

export default router;
