
import fs from "node:fs";
import {
    findAllProfiles,
    findProfileById,
    findDefaultProfile,
    createProfile,
    updateProfile,
    updateResume,
    completeProfileIntake
} from "./profiles.repository.js";
import {
    EDITABLE_FIELDS,
    coerceField,
    type EditableField
} from "./profiles.validation.js";

const REQUIRED_INTAKE_FIELDS = [
    "first_name",
    "last_name",
    "email",
    "work_authorized",
    "needs_sponsorship",
    "visa_status"
] as const;

type Profile = Record<string, any>;

export function getIntakeStatus(profile: Profile) {
    const missing: string[] = REQUIRED_INTAKE_FIELDS.filter((field) => {
        const value = profile[field];
        return value === null || value === undefined || value === "";
    });

    if (!profile.resume_path) {
        missing.push("resume");
    } else if (!fs.existsSync(profile.resume_path)) {
        missing.push("resume (file missing on disk)");
    }

    return {
        complete: missing.length === 0,
        missing
    };
}

export function isIntakeComplete(profileId: number) {
    const profile = findProfileById(profileId);

    if (!profile) {
        return {
            complete: false,
            missing: ["profile"]
        };
    }

    return getIntakeStatus(profile as Profile);
}

export function serializeProfile(profile: unknown) {
    if (!profile) return null;

    const data = profile as Profile;

    return {
        ...data,
        intake: getIntakeStatus(data)
    };
}

export function listProfiles() {
    return findAllProfiles().map(serializeProfile);
}

export function getProfile(id: string) {
    return serializeProfile(findProfileById(id));
}

export function getDefaultProfile() {
    return findDefaultProfile();
}

export function createNewProfile(body: Record<string, unknown>) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of EDITABLE_FIELDS) {
        const value = coerceField(field, body[field]);

        if (value !== undefined) {
            fields.push(field);
            values.push(value);
        }
    }

    const result = createProfile(fields, values);

    return serializeProfile(findProfileById(Number(result.lastInsertRowid)));
}

export function updateExistingProfile(
    id: string,
    body: Record<string, unknown>
) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of EDITABLE_FIELDS) {
        const value = coerceField(field, body[field]);

        if (value !== undefined) {
            fields.push(field);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return null;
    }

    updateProfile(id, fields, values);

    return serializeProfile(findProfileById(id));
}

export function saveProfileResume(
    id: string,
    resumePath: string,
    filename: string
) {
    updateResume(id, resumePath, filename);
    return serializeProfile(findProfileById(id));
}

export function completeIntake(id: string) {
    const profile = findProfileById(id);

    if (!profile) {
        return {
            error: "not_found"
        };
    }

    const status = getIntakeStatus(profile as Profile);

    if (!status.complete) {
        return {
            error: "intake_incomplete",
            missing: status.missing
        };
    }

    completeProfileIntake(id);

    return serializeProfile(findProfileById(id));
}
