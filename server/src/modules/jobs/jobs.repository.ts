
import db from "../../database/connection.js";
import type { JobQueueRow } from "./jobs.types.js";

// ─── Types ─────────────────────────────────────────────

export interface ResurrectionCandidate {
  role_url?: string | null;
  role_url_key?: string | null;
  priority?: number;
}

export interface NewJobInput {
  profile_id: number;
  company: string;
  role_title: string;
  company_key: string;
  role_key: string;
  role_url?: string | null;
  role_url_key: string | null;
  ats?: string | null;
  priority?: number;
  notes?: string | null;
}

type ExistingJob = Pick<JobQueueRow, "id">;

// ─── Job Lookup & Duplicate Detection ──────────────────

export function findExistingInQueue(
  profileId: number,
  companyKey: string,
  roleKey: string,
  roleUrlKey: string | null
): ExistingJob | undefined {
  return db.prepare(`
    SELECT id FROM job_queue
    WHERE profile_id = ?
      AND (
        status IN ('pending', 'in_progress', 'done')
        OR submitted_at IS NOT NULL
      )
      AND (
        (company_key = ? AND role_key = ?)
        OR (? IS NOT NULL AND role_url_key = ?)
      )
    LIMIT 1
  `).get(
    profileId,
    companyKey,
    roleKey,
    roleUrlKey,
    roleUrlKey
  ) as ExistingJob | undefined;
}

export function findExistingInApplications(
  profileId: number,
  companyKey: string,
  roleKey: string,
  roleUrlKey: string | null
): ExistingJob | undefined {
  return db.prepare(`
    SELECT id FROM applications
    WHERE profile_id = ?
      AND (
        (company_key = ? AND role_key = ?)
        OR (? IS NOT NULL AND role_url_key = ?)
      )
    LIMIT 1
  `).get(
    profileId,
    companyKey,
    roleKey,
    roleUrlKey,
    roleUrlKey
  ) as ExistingJob | undefined;
}

export function findSquatter(
  profileId: number,
  companyKey: string,
  roleKey: string,
  roleUrlKey: string | null
): JobQueueRow | undefined {
  return db.prepare(`
    SELECT * FROM job_queue
    WHERE profile_id = ?
      AND (
        (company_key = ? AND role_key = ?)
        OR (? IS NOT NULL AND role_url_key = ?)
      )
    LIMIT 1
  `).get(
    profileId,
    companyKey,
    roleKey,
    roleUrlKey,
    roleUrlKey
  ) as JobQueueRow | undefined;
}

// ─── Job Resurrection ──────────────────────────────────

export function canResurrect(row: JobQueueRow): boolean {
  if (row.submitted_at) {
    return false;
  }

  if (row.status !== "skipped" && row.status !== "failed") {
    return false;
  }

  if (row.skip_class === "transient") {
    return true;
  }

  if (row.skip_class === "conditional" && row.reopen_after) {
    const now = db
      .prepare("SELECT datetime('now') AS t")
      .get() as { t: string };

    return row.reopen_after <= now.t;
  }

  return false;
}

export function resurrectRow(
  row: JobQueueRow,
  candidate: ResurrectionCandidate
): void {
  const urlOwner = candidate.role_url_key
    ? db.prepare(`
        SELECT id FROM job_queue
        WHERE profile_id = ?
          AND role_url_key = ?
          AND id != ?
      `).get(
        row.profile_id,
        candidate.role_url_key,
        row.id
      )
    : null;

  db.prepare(`
    UPDATE job_queue
    SET status = 'pending',
        claimed_by = NULL,
        claimed_at = NULL,
        claim_token = NULL,
        error = NULL,
        skip_class = NULL,
        reopen_after = NULL,
        priority = MAX(COALESCE(priority, 0), ?),
        role_url = CASE
          WHEN ? THEN role_url
          ELSE COALESCE(?, role_url)
        END,
        role_url_key = CASE
          WHEN ? THEN role_url_key
          ELSE COALESCE(?, role_url_key)
        END,
        notes = COALESCE(notes, '') || ' [re-scouted ' || date('now') || ']',
        created_at = datetime('now')
    WHERE id = ?
  `).run(
    candidate.priority ?? 0,
    urlOwner ? 1 : 0,
    candidate.role_url || null,
    urlOwner ? 1 : 0,
    candidate.role_url_key || null,
    row.id
  );
}

// ─── Company Policy ────────────────────────────────────

export function isBlockedCompany(
  profileId: number,
  companyKey: string
): boolean {
  const row = db.prepare(`
    SELECT 1
    FROM company_policy
    WHERE profile_id = ?
      AND company_key = ?
      AND policy = 'blocked'
  `).get(profileId, companyKey);

  return Boolean(row);
}

// ─── Job Insertion ─────────────────────────────────────

export function insertJob(job: NewJobInput) {
  return db.prepare(`
    INSERT INTO job_queue (
      profile_id,
      company,
      role_title,
      company_key,
      role_key,
      role_url,
      role_url_key,
      ats,
      priority,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    job.profile_id,
    job.company,
    job.role_title,
    job.company_key,
    job.role_key,
    job.role_url || null,
    job.role_url_key,
    job.ats || null,
    job.priority ?? 0,
    job.notes || null
  );
}

export function getJobs(
  profileId?: number | null,
  status?: string
) {
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (profileId != null) {
    conditions.push("profile_id = ?");
    params.push(profileId);
  }

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  return db.prepare(`
    SELECT *
    FROM job_queue
    ${where}
    ORDER BY priority DESC, created_at ASC
  `).all(...params);
}

export function findAppliedJob(
  profileId: number,
  roleUrlKey: string | null,
  companyKey: string | null,
  roleKey: string | null
) {
  return db.prepare(`
    SELECT id, company, role_title
    FROM applications
    WHERE profile_id = ?
      AND (
        (? IS NOT NULL AND role_url_key = ?)
        OR (
          ? IS NOT NULL
          AND ? IS NOT NULL
          AND company_key = ?
          AND role_key = ?
        )
      )
    LIMIT 1
  `).get(
    profileId,
    roleUrlKey,
    roleUrlKey,
    companyKey,
    roleKey,
    companyKey,
    roleKey
  );
}

export function findSubmittedJob(
  profileId: number,
  roleUrlKey: string | null,
  companyKey: string | null,
  roleKey: string | null
) {
  return db.prepare(`
    SELECT id, company, role_title, status, submitted_at
    FROM job_queue
    WHERE profile_id = ?
      AND submitted_at IS NOT NULL
      AND (
        (? IS NOT NULL AND role_url_key = ?)
        OR (
          ? IS NOT NULL
          AND ? IS NOT NULL
          AND company_key = ?
          AND role_key = ?
        )
      )
    LIMIT 1
  `).get(
    profileId,
    roleUrlKey,
    roleUrlKey,
    companyKey,
    roleKey,
    companyKey,
    roleKey
  );
}


// ─── Atomic Job Claiming ───────────────────────────────

export function findNextClaimableJob(
  profileId: number
): { id: number } | undefined {
  return db.prepare(`
    SELECT id
    FROM job_queue jq
    WHERE profile_id = ?
      AND status = 'pending'
      AND submitted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM company_policy p
        WHERE p.profile_id = jq.profile_id
          AND p.company_key = jq.company_key
          AND (
            p.policy = 'blocked'
            OR p.reopen_after IS NULL
            OR p.reopen_after > datetime('now')
          )
      )
      AND (
        SELECT COUNT(*)
        FROM applications a
        WHERE a.profile_id = jq.profile_id
          AND a.company_key = jq.company_key
          AND a.created_at > datetime('now', '-1 day')
      ) < 5
      AND (
        SELECT COUNT(*)
        FROM applications a2
        WHERE a2.profile_id = jq.profile_id
          AND a2.company_key = jq.company_key
      ) < 10
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
  `).get(profileId) as { id: number } | undefined;
}

export function claimJob(
  jobId: number,
  sessionId: string,
  claimToken: string
): JobQueueRow | undefined {
  db.prepare(`
    UPDATE job_queue
    SET status = 'in_progress',
        claimed_by = ?,
        claimed_at = datetime('now'),
        claim_token = ?
    WHERE id = ?
      AND status = 'pending'
  `).run(sessionId, claimToken, jobId);

  return db.prepare(`
    SELECT *
    FROM job_queue
    WHERE id = ?
  `).get(jobId) as JobQueueRow | undefined;
}
