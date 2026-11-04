
import db from "./connection.js";

const URL_ID_PARAMS = [
  "for",
  "token",
  "gh_jid",
  "gh_jid[]",
  "ashby_jid",
  "jobId",
  "id"
] as const;

export type SkipClass = "permanent" | "conditional" | "transient";

export interface SkipClassification {
  skip_class: SkipClass;
  reopen_after: null;
}

export function normalizeKey(value: string | null | undefined): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function lookupCompanyKey(raw: string): string {
  const key = normalizeKey(raw);

  const row = db
    .prepare("SELECT canonical_key FROM company_alias WHERE raw_key = ?")
    .get(key) as { canonical_key: string } | undefined;

  return row ? row.canonical_key : key;
}

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let value = String(url).trim();

  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    const parsedUrl = new URL(value);
    const host = parsedUrl.host.toLowerCase().replace(/^www\./, "");

    const pathname = parsedUrl.pathname
      .replace(/\/+$/, "")
      .toLowerCase()
      .replace(/\/(application|apply)$/, "");

    const identifiers: string[] = [];

    for (const param of URL_ID_PARAMS) {
      const paramValue = parsedUrl.searchParams.get(param);

      if (paramValue !== null && paramValue !== "") {
        identifiers.push(`${param}=${paramValue}`);
      }
    }

    identifiers.sort();

    return identifiers.length
      ? `${host}${pathname}?${identifiers.join("&")}`
      : `${host}${pathname}`;
  } catch {
    return null;
  }
}

export function classifySkip(text: unknown): SkipClassification {
  const value = String(text || "");

  if (
    /senior|staff|principal|distinguished|director|manager|clearance|on-?site|relocat|poor-?fit|not a fit|disqualif|over-?qualif|already applied|already_applied/i.test(value)
  ) {
    return { skip_class: "permanent", reopen_after: null };
  }

  if (/\bcap\b|limit|window|at.cap/i.test(value)) {
    return { skip_class: "conditional", reopen_after: null };
  }

  if (/missing entry for required field|required field/i.test(value)) {
    return { skip_class: "conditional", reopen_after: null };
  }

  if (
    /timeout|timed out|blocker|captcha|crash|cdp|network|econn|race|re-?claim|wedge|stale|hang|navigation|render/i.test(value)
  ) {
    return { skip_class: "transient", reopen_after: null };
  }

  return { skip_class: "permanent", reopen_after: null };
}
