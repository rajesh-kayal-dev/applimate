import { Router } from "express";
import {
  checkAuthRequired,
  login
} from "./auth.controller.js";

const router = Router();

router.get("/required", checkAuthRequired);
router.post("/login", login);

export default router;
