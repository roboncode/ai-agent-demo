import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { skillMetaSchema, skillSchema, skillCreateSchema, skillUpdateSchema } from "./skills.schemas.js";
import * as handlers from "./skills.handlers.js";

const router = createRouter();

// GET / — List all skills
router.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Skills"],
    summary: "List all skills",
    responses: {
      200: {
        description: "All skills",
        content: {
          "application/json": {
            schema: z.object({
              skills: z.array(skillMetaSchema),
              count: z.number(),
            }),
          },
        },
      },
    },
  }),
  handlers.handleListSkills,
);

// GET /:name — Get a specific skill
router.openapi(
  createRoute({
    method: "get",
    path: "/{name}",
    tags: ["Skills"],
    summary: "Get a specific skill by name",
    request: {
      params: z.object({
        name: z.string().openapi({ example: "eli5" }),
      }),
    },
    responses: {
      200: {
        description: "Skill details",
        content: {
          "application/json": { schema: skillSchema },
        },
      },
      404: {
        description: "Skill not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  handlers.handleGetSkill,
);

// POST / — Create a new skill
router.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Skills"],
    summary: "Create a new skill",
    request: {
      body: {
        content: { "application/json": { schema: skillCreateSchema } },
      },
    },
    responses: {
      201: {
        description: "Skill created",
        content: {
          "application/json": { schema: skillSchema },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  handlers.handleCreateSkill,
);

// PUT /:name — Update an existing skill
router.openapi(
  createRoute({
    method: "put",
    path: "/{name}",
    tags: ["Skills"],
    summary: "Update an existing skill",
    request: {
      params: z.object({
        name: z.string().openapi({ example: "eli5" }),
      }),
      body: {
        content: { "application/json": { schema: skillUpdateSchema } },
      },
    },
    responses: {
      200: {
        description: "Skill updated",
        content: {
          "application/json": { schema: skillSchema },
        },
      },
      404: {
        description: "Skill not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  handlers.handleUpdateSkill,
);

// DELETE /:name — Delete a skill
router.openapi(
  createRoute({
    method: "delete",
    path: "/{name}",
    tags: ["Skills"],
    summary: "Delete a skill",
    request: {
      params: z.object({
        name: z.string().openapi({ example: "eli5" }),
      }),
    },
    responses: {
      200: {
        description: "Skill deleted",
        content: {
          "application/json": {
            schema: z.object({ deleted: z.boolean(), name: z.string() }),
          },
        },
      },
      404: {
        description: "Skill not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  handlers.handleDeleteSkill,
);

export default router;
