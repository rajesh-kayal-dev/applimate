
import db from "./connection.js";

const schema = `
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin TEXT,
    github TEXT,
    website TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'United States',
    zip TEXT,
    address_line1 TEXT,
    currently_employed INTEGER DEFAULT 0,
    current_employer TEXT,
    current_title TEXT,
    years_of_experience TEXT,
    school TEXT,
    degree TEXT,
    discipline TEXT,
    edu_start_year TEXT,
    edu_end_year TEXT,
    work_authorized INTEGER,
    needs_sponsorship INTEGER,
    visa_status TEXT,
    sponsorship_note TEXT,
    is_student INTEGER DEFAULT 0,
    over_18 INTEGER DEFAULT 1,
    willing_to_relocate INTEGER DEFAULT 1,
    no_noncompete INTEGER DEFAULT 1,
    clean_record INTEGER,
    background TEXT,
    positioning TEXT,
    desired_compensation TEXT,
    start_availability TEXT DEFAULT 'Immediately',
    how_heard TEXT DEFAULT 'LinkedIn',
    resume_path TEXT,
    resume_filename TEXT,
    resume_uploaded_at DATETIME,
    intake_completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS company_alias (
    raw_key TEXT PRIMARY KEY,
    canonical_key TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role_title TEXT NOT NULL,
    role_url TEXT,
    company_key TEXT NOT NULL,
    role_key TEXT NOT NULL,
    role_url_key TEXT,
    ats TEXT,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    claimed_by TEXT,
    claimed_at DATETIME,
    claim_token TEXT,
    submitted_at DATETIME,
    completed_at DATETIME,
    skip_class TEXT,
    reopen_after DATETIME,
    error TEXT,
    notes TEXT,
    qa_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_job_queue_unique_key
    ON job_queue(profile_id, company_key, role_key);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_job_queue_unique_url
    ON job_queue(profile_id, role_url_key)
    WHERE role_url_key IS NOT NULL;

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role_title TEXT NOT NULL,
    role_url TEXT,
    company_key TEXT NOT NULL,
    role_key TEXT NOT NULL,
    role_url_key TEXT,
    status TEXT DEFAULT 'Applied',
    notes TEXT,
    qa_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_key
    ON applications(profile_id, company_key, role_key);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_url
    ON applications(profile_id, role_url_key)
    WHERE role_url_key IS NOT NULL;

  CREATE TABLE IF NOT EXISTS company_policy (
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_key TEXT NOT NULL,
    policy TEXT NOT NULL CHECK (policy IN ('blocked', 'cooldown')),
    reopen_after DATETIME,
    reason TEXT,
    PRIMARY KEY (profile_id, company_key)
  );

  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TRIGGER IF NOT EXISTS profiles_updated_at
  AFTER UPDATE ON profiles
  BEGIN
    UPDATE profiles
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
  END;

  DROP TRIGGER IF EXISTS trg_jq_submit_sync_upd;
  DROP TRIGGER IF EXISTS trg_jq_submit_sync_ins;

  CREATE TRIGGER trg_jq_submit_sync_upd
  AFTER UPDATE OF status, submitted_at ON job_queue
  WHEN NEW.status IN ('done', 'failed', 'skipped')
    AND (NEW.status = 'done' OR NEW.submitted_at IS NOT NULL)
  BEGIN
    INSERT OR IGNORE INTO applications (
      profile_id, company, role_title, company_key,
      role_key, role_url, role_url_key, status, qa_json
    )
    VALUES (
      NEW.profile_id, NEW.company, NEW.role_title,
      NEW.company_key, NEW.role_key, NEW.role_url,
      NEW.role_url_key, 'Applied', NEW.qa_json
    );
  END;

  CREATE TRIGGER trg_jq_submit_sync_ins
  AFTER INSERT ON job_queue
  WHEN NEW.status IN ('done', 'failed', 'skipped')
    AND (NEW.status = 'done' OR NEW.submitted_at IS NOT NULL)
  BEGIN
    INSERT OR IGNORE INTO applications (
      profile_id, company, role_title, company_key,
      role_key, role_url, role_url_key, status, qa_json
    )
    VALUES (
      NEW.profile_id, NEW.company, NEW.role_title,
      NEW.company_key, NEW.role_key, NEW.role_url,
      NEW.role_url_key, 'Applied', NEW.qa_json
    );
  END;
`;

const seedAliases = [
  ["sierraai", "sierra"],
  ["blandai", "bland"],
  ["mistralai", "mistral"],
  ["modallabs", "modal"],
  ["axiomco", "axiom"],
  ["convexdev", "convex"],
  ["perplexityai", "perplexity"],
  ["togetherai", "together"]
];

export function initializeSchema(): void {
  db.exec(schema);

  const insertAlias = db.prepare(
    "INSERT OR IGNORE INTO company_alias (raw_key, canonical_key) VALUES (?, ?)"
  );

  for (const [raw, canonical] of seedAliases) {
    insertAlias.run(raw, canonical);
  }
}
