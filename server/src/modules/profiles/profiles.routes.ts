import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  getProfiles,
  getDefaultProfileController,
  createProfileController,
  getProfileController,
  updateProfileController,
  uploadResumeController,
  downloadResumeController,
  completeIntakeController
} from "./profiles.controller.js";

const router = Router();

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir =
  process.env.UPLOADS_DIR || path.resolve(currentDir, "../../../uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname);
    const filename = `resume-${req.params.id}-${crypto.randomUUID()}${extension}`;

    callback(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return callback(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }

    callback(null, true);
  }
});

function handleResumeUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  upload.single("resume")(req, res, (error) => {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    next();
  });
}

router.get("/", getProfiles);
router.get("/default", getDefaultProfileController);
router.post("/", createProfileController);

router.post("/:id/resume", handleResumeUpload, uploadResumeController);
router.get("/:id/resume", downloadResumeController);

router.post("/:id/complete-intake", completeIntakeController);

router.get("/:id", getProfileController);
router.put("/:id", updateProfileController);

export default router;