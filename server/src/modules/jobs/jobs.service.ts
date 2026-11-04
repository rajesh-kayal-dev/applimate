
import type { Request } from "express";

import db from "../../database/connection.js";
import { getDefaultProfile, isIntakeComplete } from "../profiles/profiles.service.js";


export function resolveProfileId(req: Request): number | null {
    const raw = req.body?.profile_id ?? req.query?.profile_id;

    if (raw !== undefined && raw !== null && raw !== "") {
        const id = Number(raw);

        const profile = db
            .prepare("SELECT id FROM profiles WHERE id = ?")
            .get(id) as { id: number } | undefined;

        return profile ? id : null;
    }

    const defaultProfile = getDefaultProfile();

    return defaultProfile ? Number(defaultProfile.id) : null;
}

export function isPaused(): boolean {
    const row = db.prepare(`
    SELECT value FROM app_state WHERE key = 'paused'
  `).get() as { value: string } | undefined;

    return row?.value === "1";
}

export function setPaused(value: boolean): void {
    db.prepare(`
    INSERT INTO app_state (key, value)
    VALUES ('paused', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(value ? "1" : "0");
}

const STALE_MINUTES = 90;

export function releaseStale(): void {
    db.prepare(`
    UPDATE job_queue
    SET status = 'failed',
        skip_class = 'permanent',
        error = COALESCE(error, '') ||
          ' [stale claim after submit — parked for review]'
    WHERE status = 'in_progress'
      AND submitted_at IS NOT NULL
      AND claimed_at < datetime('now', '-${STALE_MINUTES} minutes')
  `).run();

    db.prepare(`
    UPDATE job_queue
    SET status = 'pending',
        claimed_by = NULL,
        claimed_at = NULL,
        claim_token = NULL
    WHERE status = 'in_progress'
      AND submitted_at IS NULL
      AND claimed_at < datetime('now', '-${STALE_MINUTES} minutes')
  `).run();
}

export function getIntakeStatus(profileId: number) {
    return isIntakeComplete(profileId);
}