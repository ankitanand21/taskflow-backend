import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { auth } from "../../middleware/auth";
import { AppError } from "../../utils/errors";
const r = Router();
r.use(auth);
r.post("/tasks/:taskId/comments", async (req, res, next) => {
  try {
    const b = z.object({ body: z.string().min(1).max(5000) }).parse(req.body);
    const t = await prisma.task.findFirst({
      where: {
        id: req.params.taskId,
        project: { organizationId: req.auth!.organizationId },
        deletedAt: null,
      },
    });
    if (!t) throw new AppError(403, "TASK_FORBIDDEN", "Forbidden");
    res
      .status(201)
      .json(
        await prisma.comment.create({
          data: { taskId: t.id, userId: req.auth!.userId, body: b.body },
        }),
      );
  } catch (e) {
    next(e);
  }
});
r.get("/tasks/:taskId/comments", async (req, res, next) => {
  try {
    const t = await prisma.task.findFirst({
      where: {
        id: req.params.taskId,
        project: { organizationId: req.auth!.organizationId },
      },
    });
    if (!t) throw new AppError(403, "TASK_FORBIDDEN", "Forbidden");
    res.json(
      await prisma.comment.findMany({
        where: { taskId: t.id },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      }),
    );
  } catch (e) {
    next(e);
  }
});
export default r;
