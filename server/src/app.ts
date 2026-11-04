import "dotenv/config";
import express from "express";
import cors from "cors";
import profilesRoutes from "./modules/profiles/profiles.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import { isDatabaseConnected } from "./database/index.js";
import { authMiddleware } from "./modules/auth/auth.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/api/health", (_req, res) => {
  const databaseConnected = isDatabaseConnected();

  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "error",
    database: databaseConnected ? "connected" : "disconnected"
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/profiles", authMiddleware, profilesRoutes);


export default app;
