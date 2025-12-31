/**
 * PlanSignal Golden Test Vectors
 * 
 * These tests demonstrate deterministic state resolution
 * at different evaluation timestamps.
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/plansignal_test',
});

interface PlanStateResponse {
  state: 'active' | 'expired' | 'none';
  plan: string | null;
  evaluated_at: string;
  provenance: {
    origin: string;
    reason: string;
    policy_version: string;
  } | null;
}

async function setup(): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS plan_assignments;
    CREATE TABLE plan_assignments (
      id SERIAL PRIMARY KEY,
      subject TEXT NOT NULL,
      scope TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      origin TEXT NOT NULL,
      reason TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      effective_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_plan_assignments_subject_scope 
    ON plan_assignments (subject, scope, effective_at DESC);
  `);
}

async function teardown(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS plan_assignments');
  await pool.end();
}

async function resolvePlanState(
  subject: string,
  scope: string,
  evaluatedAt: Date
): Promise<PlanStateResponse> {
  const evaluatedAtISO = evaluatedAt.toISOString();

  const result = await pool.query(
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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
  }
}

async function runTests(): Promise<void> {
  console.log('setup');
  await setup();

  console.log('\n--- Vector 1: No Assignment Exists ---\n');

  // Query for a subject/scope that has never been assigned
  const noAssignmentResult = await resolvePlanState('user:unknown', 'billing', new Date('2024-06-01T00:00:00Z'));
  
  console.log('Test 0: No assignment exists for subject/scope');
  console.log('  Expected state: none');
  console.log('  Actual state:', noAssignmentResult.state);
  assertEqual(noAssignmentResult.state, 'none', 'State should be none when no assignment exists');
  assertEqual(noAssignmentResult.plan, null, 'Plan should be null');
  assertEqual(noAssignmentResult.provenance, null, 'Provenance should be null');
  console.log('  PASS');

  console.log('\n--- Vector 2: Active to Expired Transition ---\n');

  // Insert a plan assignment that expires
  const effectiveAt = new Date('2024-01-01T00:00:00Z');
  const expiresAt = new Date('2024-06-01T00:00:00Z');

  await pool.query(
    `INSERT INTO plan_assignments 
     (subject, scope, plan_id, origin, reason, policy_version, effective_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      'user:12345',
      'billing',
      'pro_monthly',
      'stripe_webhook',
      'subscription_created',
      'v2024.1',
      effectiveAt.toISOString(),
      expiresAt.toISOString(),
    ]
  );

  console.log('Stored fact:');
  console.log('  subject: user:12345');
  console.log('  scope: billing');
  console.log('  plan_id: pro_monthly');
  console.log('  effective_at: 2024-01-01T00:00:00Z');
  console.log('  expires_at: 2024-06-01T00:00:00Z');

  // Test 1: Evaluate before effective_at → none
  const evalBeforeEffective = new Date('2023-12-15T00:00:00Z');
  const result1 = await resolvePlanState('user:12345', 'billing', evalBeforeEffective);
  
  console.log('\nTest 1: Evaluate at 2023-12-15 (before effective_at)');
  console.log('  Expected state: none');
  console.log('  Actual state:', result1.state);
  assertEqual(result1.state, 'none', 'State should be none before effective_at');
  assertEqual(result1.plan, null, 'Plan should be null');
  assertEqual(result1.provenance, null, 'Provenance should be null');
  console.log('  PASS');

  // Test 2: Evaluate during active period → active
  const evalDuringActive = new Date('2024-03-15T00:00:00Z');
  const result2 = await resolvePlanState('user:12345', 'billing', evalDuringActive);
  
  console.log('\nTest 2: Evaluate at 2024-03-15 (during active period)');
  console.log('  Expected state: active');
  console.log('  Actual state:', result2.state);
  assertEqual(result2.state, 'active', 'State should be active during valid period');
  assertEqual(result2.plan, 'pro_monthly', 'Plan should be pro_monthly');
  assertEqual(result2.provenance?.origin, 'stripe_webhook', 'Origin should match');
  console.log('  PASS');

  // Test 3: Evaluate after expires_at → expired
  const evalAfterExpiry = new Date('2024-07-01T00:00:00Z');
  const result3 = await resolvePlanState('user:12345', 'billing', evalAfterExpiry);
  
  console.log('\nTest 3: Evaluate at 2024-07-01 (after expires_at)');
  console.log('  Expected state: expired');
  console.log('  Actual state:', result3.state);
  assertEqual(result3.state, 'expired', 'State should be expired after expires_at');
  assertEqual(result3.plan, 'pro_monthly', 'Plan should still be pro_monthly');
  assertEqual(result3.provenance?.origin, 'stripe_webhook', 'Origin should match');
  console.log('  PASS');

  console.log('\n--- Vector 3: No Side Effects ---\n');

  // Verify that reading state does not modify the database
  const countBefore = await pool.query('SELECT COUNT(*) as count FROM plan_assignments');
  
  await resolvePlanState('user:12345', 'billing', new Date());
  await resolvePlanState('user:12345', 'billing', new Date());
  await resolvePlanState('user:12345', 'billing', new Date());
  
  const countAfter = await pool.query('SELECT COUNT(*) as count FROM plan_assignments');
  
  console.log('Test 4: Multiple reads do not modify database');
  console.log('  Row count before reads:', countBefore.rows[0].count);
  console.log('  Row count after reads:', countAfter.rows[0].count);
  assertEqual(countBefore.rows[0].count, countAfter.rows[0].count, 'Row count should not change');
  console.log('  PASS');

  console.log('\n--- Vector 4: Deterministic Output ---\n');

  // Same inputs produce same outputs
  const fixedEvalTime = new Date('2024-04-01T12:00:00Z');
  const resultA = await resolvePlanState('user:12345', 'billing', fixedEvalTime);
  const resultB = await resolvePlanState('user:12345', 'billing', fixedEvalTime);
  
  console.log('Test 5: Same inputs produce identical outputs');
  assertEqual(resultA.state, resultB.state, 'States should match');
  assertEqual(resultA.plan, resultB.plan, 'Plans should match');
  assertEqual(resultA.evaluated_at, resultB.evaluated_at, 'Timestamps should match');
  console.log('  PASS');

  console.log('\n--- Vector 5: Non-expiring Plan ---\n');

  // Insert a plan with no expiration
  await pool.query(
    `INSERT INTO plan_assignments 
     (subject, scope, plan_id, origin, reason, policy_version, effective_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      'org:99999',
      'features',
      'enterprise_lifetime',
      'admin_portal',
      'manual_grant',
      'v2024.2',
      new Date('2024-01-01T00:00:00Z').toISOString(),
      null,
    ]
  );

  const farFuture = new Date('2099-12-31T23:59:59Z');
  const result4 = await resolvePlanState('org:99999', 'features', farFuture);
  
  console.log('Test 6: Plan with null expires_at remains active indefinitely');
  console.log('  Evaluated at: 2099-12-31');
  console.log('  Expected state: active');
  console.log('  Actual state:', result4.state);
  assertEqual(result4.state, 'active', 'State should be active with null expires_at');
  console.log('  PASS');

  console.log('\n--- done ---\n');

  await teardown();
}

runTests().catch((err) => {
  console.error('fail:', err);
  pool.end();
  process.exit(1);
});
