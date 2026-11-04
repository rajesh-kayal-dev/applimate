import { Router } from "express";

import {
    listJobs,
    getPausedStatus,
    pauseJobs,
    resumeJobs,
    createJob,
    createBulkJobs,
    checkAppliedJob,
    claimNextJob
} from "./jobs.controller.js";

const router = Router();

router.get("/", listJobs);
router.get("/paused", getPausedStatus);
router.post("/pause", pauseJobs);
router.post("/resume", resumeJobs);
router.post("/", createJob);
router.post("/bulk", createBulkJobs);
router.get("/applied", checkAppliedJob);
router.post("/claim", claimNextJob);

export default router;
