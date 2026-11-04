import type { Request, Response } from "express";

import db from "../../database/connection.js";
import { isValidJobCandidate } from "./jobs.validation.js";

import {
    lookupCompanyKey,
    normalizeKey,
    normalizeUrl
} from "../../database/helpers.js";

import {
    getJobs,
    findExistingInQueue,
    findExistingInApplications,
    findSquatter,
    canResurrect,
    resurrectRow,
    isBlockedCompany,
    insertJob,
    findAppliedJob,
    findSubmittedJob,
    findNextClaimableJob,
    claimJob
} from "./jobs.repository.js";

import {
    resolveProfileId,
    releaseStale,
    isPaused,
    setPaused,
    getIntakeStatus
} from "./jobs.service.js";

import { randomUUID } from "node:crypto";


// GET /api/jobs
export function listJobs(req: Request, res: Response) {
    releaseStale();

    const profileId = resolveProfileId(req);

    const status =
        typeof req.query.status === "string"
            ? req.query.status
            : undefined;

    const jobs = getJobs(profileId, status);

    return res.json(jobs);
}

// GET /api/jobs/paused
export function getPausedStatus(
    _req: Request,
    res: Response
) {
    const inProgress = db.prepare(`
    SELECT id, profile_id, company, role_title, claimed_by
    FROM job_queue
    WHERE status = 'in_progress'
  `).all();

    const pendingResult = db.prepare(`
    SELECT COUNT(*) AS n
    FROM job_queue
    WHERE status = 'pending'
  `).get() as { n: number };

    return res.json({
        paused: isPaused(),
        in_progress: inProgress,
        pending: pendingResult.n
    });
}
// POST /api/jobs/pause
export function pauseJobs(
    _req: Request,
    res: Response
) {
    setPaused(true);

    return res.json({
        paused: true,
        message: "Paused. Apply sessions stop after their current role."
    });
}

// POST /api/jobs/resume
export function resumeJobs(
    _req: Request,
    res: Response
) {
    setPaused(false);

    return res.json({
        paused: false
    });
}


// POST /api/jobs
export function createJob(req: Request, res: Response) {
    const {
        company,
        role_title,
        role_url,
        ats,
        priority,
        notes
    } = req.body;

    if (!company || !role_title) {
        return res.status(400).json({
            error: "company and role_title are required"
        });
    }

    const profileId = resolveProfileId(req);

    if (profileId == null) {
        return res.status(400).json({ error: "no_profile" });
    }

    const companyKey = lookupCompanyKey(company);
    const roleKey = normalizeKey(role_title);
    const roleUrlKey = normalizeUrl(role_url);

    if (isBlockedCompany(profileId, companyKey)) {
        return res.status(409).json({
            error: "company_blocked"
        });
    }

    let resurrectedId: number | null = null;
    let insertedId: number | null = null;

    db.exec("BEGIN IMMEDIATE");

    try {
        const inQueue = findExistingInQueue(
            profileId,
            companyKey,
            roleKey,
            roleUrlKey
        );

        if (inQueue) {
            db.exec("ROLLBACK");

            return res.status(409).json({
                error: "duplicate",
                existing_id: inQueue.id
            });
        }

        const applied = findExistingInApplications(
            profileId,
            companyKey,
            roleKey,
            roleUrlKey
        );

        if (applied) {
            db.exec("ROLLBACK");

            return res.status(409).json({
                error: "already_applied",
                application_id: applied.id
            });
        }

        const squatter = findSquatter(
            profileId,
            companyKey,
            roleKey,
            roleUrlKey
        );

        if (squatter) {
            if (canResurrect(squatter)) {
                resurrectRow(squatter, {
                    role_url,
                    role_url_key: roleUrlKey,
                    priority
                });

                resurrectedId = squatter.id;
                db.exec("COMMIT");
            } else {
                db.exec("ROLLBACK");

                return res.status(409).json({
                    error: "duplicate",
                    existing_id: squatter.id,
                    skipped_as: squatter.skip_class
                });
            }
        } else {
            const result = insertJob({
                profile_id: profileId,
                company,
                role_title,
                company_key: companyKey,
                role_key: roleKey,
                role_url,
                role_url_key: roleUrlKey,
                ats,
                priority,
                notes
            });

            insertedId = Number(result.lastInsertRowid);

            db.exec("COMMIT");
        }
    } catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }

    if (resurrectedId !== null) {
        const job = db.prepare(`
      SELECT * FROM job_queue WHERE id = ?
    `).get(resurrectedId);

        return res.json({
            resurrected: true,
            job
        });
    }

    const job = db.prepare(`
    SELECT * FROM job_queue WHERE id = ?
  `).get(insertedId);

    return res.status(201).json(job);
}


// POST /api/jobs/bulk
export function createBulkJobs(req: Request, res: Response) {
    const jobs: unknown = Array.isArray(req.body)
        ? req.body
        : req.body?.jobs;

    if (!Array.isArray(jobs) || jobs.length === 0) {
        return res.status(400).json({
            error: "jobs must be a non-empty array"
        });
    }

    const profileId = resolveProfileId(req);

    if (profileId == null) {
        return res.status(400).json({ error: "no_profile" });
    }

    let added = 0;
    let resurrected = 0;
    let skipped = 0;

    db.exec("BEGIN IMMEDIATE");

    try {
        for (const candidate of jobs) {
            if (!isValidJobCandidate(candidate)) {
                continue;
            }

            const {
                company,
                role_title,
                role_url,
                ats,
                priority,
                notes
            } = candidate;

            const companyKey = lookupCompanyKey(company);
            const roleKey = normalizeKey(role_title);
            const roleUrlKey = normalizeUrl(role_url);

            // Skip blocked, already-applied and existing active jobs.
            if (
                isBlockedCompany(profileId, companyKey) ||
                findExistingInApplications(
                    profileId,
                    companyKey,
                    roleKey,
                    roleUrlKey
                ) ||
                findExistingInQueue(
                    profileId,
                    companyKey,
                    roleKey,
                    roleUrlKey
                )
            ) {
                skipped++;
                continue;
            }

            // Check whether an old failed/skipped row can be restored.
            const squatter = findSquatter(
                profileId,
                companyKey,
                roleKey,
                roleUrlKey
            );

            if (squatter) {
                if (canResurrect(squatter)) {
                    resurrectRow(squatter, {
                        role_url,
                        role_url_key: roleUrlKey,
                        priority
                    });

                    resurrected++;
                } else {
                    skipped++;
                }

                continue;
            }

            try {
                insertJob({
                    profile_id: profileId,
                    company,
                    role_title,
                    company_key: companyKey,
                    role_key: roleKey,
                    role_url,
                    role_url_key: roleUrlKey,
                    ats,
                    priority,
                    notes
                });

                added++;
            } catch (error) {
                const sqliteError = error as { errcode?: number };

                if (sqliteError.errcode === 2067) {
                    skipped++;
                    continue;
                }

                throw error;
            }
        }

        db.exec("COMMIT");
    } catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }

    return res.json({
        added,
        resurrected,
        skipped,
        total: jobs.length
    });
}
// GET /api/jobs/applied
export function checkAppliedJob(req: Request, res: Response) {
    const url =
        typeof req.query.url === "string" ? req.query.url : null;

    const company =
        typeof req.query.company === "string" ? req.query.company : null;

    const roleTitle =
        typeof req.query.role_title === "string"
            ? req.query.role_title
            : null;

    const profileId = resolveProfileId(req);

    if (profileId == null) {
        return res.status(400).json({ error: "no_profile" });
    }

    const roleUrlKey = normalizeUrl(url);
    const companyKey = company ? lookupCompanyKey(company) : null;
    const roleKey = roleTitle ? normalizeKey(roleTitle) : null;

    if (!roleUrlKey && !(companyKey && roleKey)) {
        return res.status(400).json({
            error: "pass url, or company+role_title"
        });
    }

    const appHit = findAppliedJob(
        profileId,
        roleUrlKey,
        companyKey,
        roleKey
    );

    if (appHit) {
        return res.json({
            applied: true,
            source: "applications",
            ...appHit
        });
    }

    const queueHit = findSubmittedJob(
        profileId,
        roleUrlKey,
        companyKey,
        roleKey
    );

    if (queueHit) {
        return res.json({
            applied: true,
            source: "job_queue_submitted",
            ...queueHit
        });
    }

    return res.json({ applied: false });
}

// POST /api/jobs/claim
export function claimNextJob(req: Request, res: Response) {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({
      error: "session_id is required"
    });
  }

  const profileId = resolveProfileId(req);

  if (profileId == null) {
    return res.status(400).json({ error: "no_profile" });
  }

  const intake = getIntakeStatus(profileId);

  if (!intake.complete) {
    return res.status(412).json({
      error: "intake_incomplete",
      missing: intake.missing,
      hint: "Finish onboarding (resume upload + work-authorization questions) before applying."
    });
  }

  if (isPaused()) {
    return res.status(204).end();
  }

  releaseStale();

  const claimToken = randomUUID();

  let job;

  db.exec("BEGIN IMMEDIATE");

  try {
    const next = findNextClaimableJob(profileId);

    if (next) {
      job = claimJob(next.id, String(session_id), claimToken);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (!job || job.status !== "in_progress") {
    return res.status(204).end();
  }

  return res.json(job);
}