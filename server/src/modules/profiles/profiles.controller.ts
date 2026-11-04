import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";

import {
  listProfiles,
  getProfile,
  getDefaultProfile,
  createNewProfile,
  updateExistingProfile,
  saveProfileResume,
  completeIntake
} from "./profiles.service.js";

function getProfileId(req: Request): string {
  return String(req.params.id);
}

export function getProfiles(_req: Request, res: Response) {
  return res.json(listProfiles());
}

export function getDefaultProfileController(
  _req: Request,
  res: Response
) {
  const profile = getDefaultProfile();

  if (!profile) {
    return res.status(404).json({
      error: "no_profile",
      hint: "complete onboarding first"
    });
  }

  return res.json(profile);
}

export function createProfileController(
  req: Request,
  res: Response
) {
  const body = req.body || {};

  if (!body.first_name || !body.last_name || !body.email) {
    return res.status(400).json({
      error: "first_name, last_name, and email are required"
    });
  }

  const profile = createNewProfile(body);

  return res.status(201).json(profile);
}

export function getProfileController(
  req: Request,
  res: Response
) {
  const profile = getProfile(getProfileId(req));

  if (!profile) {
    return res.status(404).json({
      error: "not_found"
    });
  }

  return res.json(profile);
}

export function updateProfileController(
  req: Request,
  res: Response
) {
  const id = getProfileId(req);
  const profile = getProfile(id);

  if (!profile) {
    return res.status(404).json({
      error: "not_found"
    });
  }

  const updatedProfile = updateExistingProfile(
    id,
    req.body || {}
  );

  if (!updatedProfile) {
    return res.status(400).json({
      error: "nothing_to_update"
    });
  }

  return res.json(updatedProfile);
}

export function uploadResumeController(
  req: Request,
  res: Response
) {
  const id = getProfileId(req);
  const profile = getProfile(id);

  if (!profile) {
    return res.status(404).json({
      error: "not_found"
    });
  }

  if (!req.file) {
    return res.status(400).json({
      error: 'no file — send multipart field "resume"'
    });
  }

  const previousPath = (
    profile as Record<string, unknown>
  ).resume_path;

  const resumePath = req.file.path;

  if (
    typeof previousPath === "string" &&
    previousPath !== resumePath
  ) {
    try {
      fs.unlinkSync(previousPath);
    } catch {
      // Ignore missing previous files.
    }
  }

  const updatedProfile = saveProfileResume(
    id,
    resumePath,
    req.file.originalname
  );

  return res.json(updatedProfile);
}

export function downloadResumeController(
  req: Request,
  res: Response
) {
  const profile = getProfile(getProfileId(req)) as
    | Record<string, unknown>
    | null;

  const resumePath = profile?.resume_path;
  const resumeFilename = profile?.resume_filename;

  if (
    typeof resumePath !== "string" ||
    !fs.existsSync(resumePath)
  ) {
    return res.status(404).json({
      error: "no_resume"
    });
  }

  const filename =
    typeof resumeFilename === "string"
      ? resumeFilename
      : path.basename(resumePath);

  return res.download(resumePath, filename);
}

export function completeIntakeController(
  req: Request,
  res: Response
) {
  const result = completeIntake(getProfileId(req));

  if (result && "error" in result) {
    if (result.error === "not_found") {
      return res.status(404).json({
        error: "not_found"
      });
    }

    return res.status(400).json(result);
  }

  return res.json(result);
}
