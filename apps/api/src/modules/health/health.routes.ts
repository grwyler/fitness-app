import { Router } from "express";
import { seedPrograms } from "@fitness/db";
import { success } from "../../lib/http/envelope.js";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json(
    success({
      status: "ok",
      service: "fitness-api",
      version: "0.1.0",
      seededPrograms: seedPrograms.map((program) => ({
        name: program.name,
        templates: program.templates.length
      }))
    })
  );
});

