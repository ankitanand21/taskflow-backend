import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./modules/auth/routes";
import projectRoutes from "./modules/projects/routes";
import taskRoutes from "./modules/tasks/routes";
import assignmentRoutes from "./modules/assignments/routes";
import commentRoutes from "./modules/comments/routes";
import jobRoutes from "./modules/jobs/routes";
import memberRoutes from "./modules/members/routes";

import { errorHandler } from "./middleware/error";
import openapi from "../docs/openapi.json";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);

/* Swagger MUST come before taskRoutes because taskRoutes is mounted at "/" */
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.use("/", taskRoutes);

app.use("/assignments", assignmentRoutes);
app.use("/comments", commentRoutes);
app.use("/jobs", jobRoutes);
app.use("/members", memberRoutes);

app.use(errorHandler);