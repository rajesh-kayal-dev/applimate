
import { db } from "../../database/index.js";

export function findAllProfiles() {
  return db
    .prepare("SELECT * FROM profiles ORDER BY id ASC")
    .all();
}

export function findProfileById(id: string | number) {
  return db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id);
}

export function findDefaultProfile() {
  return db
    .prepare("SELECT * FROM profiles ORDER BY id ASC LIMIT 1")
    .get() ?? null;
}

export function createProfile(
  fields: string[],
  values: (string | number | null)[]
) {
  const placeholders = fields.map(() => "?").join(", ");

  return db
    .prepare(
      `INSERT INTO profiles (${fields.join(", ")}) VALUES (${placeholders})`
    )
    .run(...values);
}

export function updateProfile(
  id: string | number,
  fields: string[],
  values: (string | number | null)[]
) {
  const updates = fields.map((field) => `${field} = ?`).join(", ");

  return db
    .prepare(`UPDATE profiles SET ${updates} WHERE id = ?`)
    .run(...values, id);
}

export function updateResume(
  id: string | number,
  resumePath: string,
  filename: string
) {
  return db
    .prepare(`
      UPDATE profiles
      SET resume_path = ?,
          resume_filename = ?,
          resume_uploaded_at = datetime('now')
      WHERE id = ?
    `)
    .run(resumePath, filename, id);
}

export function completeProfileIntake(id: string | number) {
  return db
    .prepare(`
      UPDATE profiles
      SET intake_completed_at = datetime('now')
      WHERE id = ?
    `)
    .run(id);
}
