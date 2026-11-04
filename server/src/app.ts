import express from "express";
import cors from "cors";
import profilesRoutes from "./modules/profiles/profiles.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Applimate API is running"
  });
});
app.use("/api/profiles", profilesRoutes);


export default app;
