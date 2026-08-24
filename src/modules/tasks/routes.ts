import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { auth } from "../../middleware/auth";
import { AppError } from "../../utils/errors";

const r = Router();

r.use(auth);

const taskBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().datetime().optional(),
});

async function getTask(id: string, org: string) {
  return prisma.task.findFirst({
    where: {
      id,
      deletedAt: null,
      project: {
        organizationId: org,
        deletedAt: null,
      },
    },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

/* Create task */
r.post("/projects/:projectId/tasks", async (req, res, next) => {
  try {
    const b = taskBody.parse(req.body);

    const p = await prisma.project.findFirst({
      where: {
        id: req.params.projectId,
        organizationId: req.auth!.organizationId,
        deletedAt: null,
      },
    });

    if (!p) {
      throw new AppError(403, "PROJECT_FORBIDDEN", "Forbidden");
    }

    const task = await prisma.task.create({
      data: {
        ...b,
        dueDate: b.dueDate ? new Date(b.dueDate) : undefined,
        projectId: p.id,
      },
    });

    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

/* List/filter project tasks */
r.get("/projects/:projectId/tasks", async (req, res, next) => {
  try {
    const p = await prisma.project.findFirst({
      where: {
        id: req.params.projectId,
        organizationId: req.auth!.organizationId,
        deletedAt: null,
      },
    });

    if (!p) {
      throw new AppError(403, "PROJECT_FORBIDDEN", "Forbidden");
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit ?? 20)),
    );

    const where: any = {
      projectId: p.id,
      deletedAt: null,
    };

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.priority) {
      where.priority = req.query.priority;
    }

    if (req.query.assignee) {
      where.assignments = {
        some: {
          userId: String(req.query.assignee),
        },
      };
    }

    if (req.query.dueFrom || req.query.dueTo) {
      where.dueDate = {
        ...(req.query.dueFrom
          ? { gte: new Date(String(req.query.dueFrom)) }
          : {}),
        ...(req.query.dueTo
          ? { lte: new Date(String(req.query.dueTo)) }
          : {}),
      };
    }

    const [data, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
    });
  } catch (e) {
    next(e);
  }
});

/* Get single task */
r.get("/tasks/:id", async (req, res, next) => {
  try {
    const t = await getTask(
      req.params.id,
      req.auth!.organizationId,
    );

    if (!t) {
      throw new AppError(403, "TASK_FORBIDDEN", "Forbidden");
    }

    res.json(t);
  } catch (e) {
    next(e);
  }
});

/* Update task */
r.patch("/tasks/:id", async (req, res, next) => {
  try {
    const b = taskBody.partial().parse(req.body);

    const t = await getTask(
      req.params.id,
      req.auth!.organizationId,
    );

    if (!t) {
      throw new AppError(403, "TASK_FORBIDDEN", "Forbidden");
    }

    const updated = await prisma.task.update({
      where: {
        id: t.id,
      },
      data: {
        ...b,
        dueDate: b.dueDate
          ? new Date(b.dueDate)
          : undefined,
      },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/* Delete task */
r.delete("/tasks/:id", async (req, res, next) => {
  try {
    const t = await getTask(
      req.params.id,
      req.auth!.organizationId,
    );

    if (!t) {
      throw new AppError(403, "TASK_FORBIDDEN", "Forbidden");
    }

    await prisma.task.update({
      where: {
        id: t.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default r;