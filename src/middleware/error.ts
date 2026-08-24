import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
export function errorHandler(
  e: any,
  _: Request,
  res: Response,
  _n: NextFunction,
) {
  if (e instanceof ZodError)
    return res
      .status(400)
      .json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: e.issues,
      });
  if (e instanceof AppError)
    return res
      .status(e.status)
      .json({ error: e.message, code: e.code, details: e.details });
  console.error(e);
  return res
    .status(500)
    .json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: {},
    });
}
