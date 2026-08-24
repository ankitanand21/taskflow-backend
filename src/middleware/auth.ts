import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../utils/jwt";
import { prisma } from "../config/database";
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        organizationId: string;
        role: "org_admin" | "member";
      };
    }
  }
}
export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer "))
      return res
        .status(401)
        .json({ error: "Unauthorized", code: "UNAUTHORIZED", details: {} });
    const c = verifyAccess(h.slice(7));
    const m = await prisma.orgMember.findFirst({
      where: { userId: c.userId, organizationId: c.organizationId },
    });
    if (!m)
      return res
        .status(403)
        .json({ error: "Forbidden", code: "FORBIDDEN", details: {} });
    req.auth = {
      userId: c.userId,
      organizationId: c.organizationId,
      role: m.role,
    };
    next();
  } catch {
    return res
      .status(401)
      .json({ error: "Invalid token", code: "INVALID_TOKEN", details: {} });
  }
}
export const admin = (req: Request, res: Response, next: NextFunction) =>
  req.auth?.role === "org_admin"
    ? next()
    : res
        .status(403)
        .json({
          error: "Admin access required",
          code: "ADMIN_REQUIRED",
          details: {},
        });
