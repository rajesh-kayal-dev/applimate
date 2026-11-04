import type {
  JobCandidate,
  JobStatus,
  SkipClass
} from "./jobs.types.js";

export const ALLOWED_STATUSES: JobStatus[] = [
  "pending",
  "in_progress",
  "done",
  "failed",
  "skipped"
];

export const ALLOWED_SKIP_CLASSES: SkipClass[] = [
  "permanent",
  "conditional",
  "transient"
];

export function isValidJobStatus(
  status: unknown
): status is JobStatus {
  return (
    typeof status === "string" &&
    ALLOWED_STATUSES.includes(status as JobStatus)
  );
}

export function isValidSkipClass(
  skipClass: unknown
): skipClass is SkipClass {
  return (
    typeof skipClass === "string" &&
    ALLOWED_SKIP_CLASSES.includes(skipClass as SkipClass)
  );
}

export function parseProfileId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const profileId = Number(value);

  if (!Number.isInteger(profileId) || profileId <= 0) {
    return null;
  }

  return profileId;
}

export function isValidJobCandidate(
  candidate: unknown
): candidate is JobCandidate {
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    return false;
  }

  const job = candidate as Record<string, unknown>;

  return (
    typeof job.company === "string" &&
    job.company.trim().length > 0 &&
    typeof job.role_title === "string" &&
    job.role_title.trim().length > 0
  );
}

export function normalizeJobCandidate(
  candidate: JobCandidate
): JobCandidate {
  return {
    ...candidate,
    company: candidate.company.trim(),
    role_title: candidate.role_title.trim(),
    role_url: candidate.role_url?.trim() || null,
    ats: candidate.ats?.trim() || null,
    notes: candidate.notes?.trim() || null
  };
}