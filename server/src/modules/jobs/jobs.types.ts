
export type JobStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "failed"
  | "skipped";

export type SkipClass =
  | "permanent"
  | "conditional"
  | "transient";

export type CompanyPolicyType = "blocked" | "cooldown";

export interface JobQueueRow {
  id: number;
  profile_id: number;
  company: string;
  role_title: string;
  role_url: string | null;
  company_key: string;
  role_key: string;
  role_url_key: string | null;
  ats: string | null;
  priority: number;
  status: JobStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  claim_token: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  skip_class: SkipClass | null;
  reopen_after: string | null;
  error: string | null;
  notes: string | null;
  qa_json: string | null;
  created_at: string;
}

export interface ApplicationRow {
  id: number;
  profile_id: number;
  company: string;
  role_title: string;
  role_url: string | null;
  company_key: string;
  role_key: string;
  role_url_key: string | null;
  status: string;
  notes: string | null;
  qa_json: string | null;
  created_at: string;
}

export interface CompanyPolicyRow {
  profile_id: number;
  company_key: string;
  policy: CompanyPolicyType;
  reopen_after: string | null;
  reason: string | null;
}

export interface JobCandidate {
  company: string;
  role_title: string;
  role_url?: string | null;
  ats?: string | null;
  priority?: number;
  notes?: string | null;
}
