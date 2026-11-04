export const EDITABLE_FIELDS = [
  "first_name",
  "last_name",
  "preferred_name",
  "email",
  "phone",
  "linkedin",
  "github",
  "website",
  "city",
  "state",
  "country",
  "zip",
  "address_line1",
  "currently_employed",
  "current_employer",
  "current_title",
  "years_of_experience",
  "school",
  "degree",
  "discipline",
  "edu_start_year",
  "edu_end_year",
  "work_authorized",
  "needs_sponsorship",
  "visa_status",
  "sponsorship_note",
  "is_student",
  "over_18",
  "willing_to_relocate",
  "no_noncompete",
  "clean_record",
  "background",
  "positioning",
  "desired_compensation",
  "start_availability",
  "how_heard"
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

const BOOLEAN_FIELDS = new Set<EditableField>([
  "currently_employed",
  "work_authorized",
  "needs_sponsorship",
  "is_student",
  "over_18",
  "willing_to_relocate",
  "no_noncompete",
  "clean_record"
]);

export function coerceField(
  field: EditableField,
  value: unknown
): string | number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (BOOLEAN_FIELDS.has(field)) {
    return value === true || value === 1 || value === "1" ? 1 : 0;
  }

  return String(value);
}
