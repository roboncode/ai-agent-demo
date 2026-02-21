import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import {
  saveScript,
  getScript,
  updateScript,
  deleteScript,
  listScripts,
} from "../../storage/script-store.js";
import { executeScript } from "../../tools/scripts.js";
import {
  scriptNameParam,
  scriptBodySchema,
  scriptDetailSchema,
  scriptListSchema,
  scriptEntrySchema,
  runRequestSchema,
  runResultSchema,
} from "./scripts.schemas.js";

const router = createRouter();

// GET / — List all scripts
router.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Scripts"],
    summary: "List all scripts",
    description: "Returns metadata for all stored scripts",
    responses: {
      200: {
        description: "List of scripts",
        content: { "application/json": { schema: scriptListSchema } },
      },
    },
  }),
  async (c) => {
    const entries = await listScripts();
    return c.json({
      scripts: entries.map(({ name, description, updatedAt }) => ({
        name,
        description,
        updatedAt,
      })),
      count: entries.length,
    });
  },
);

// GET /:name — Get script code + meta
router.openapi(
  createRoute({
    method: "get",
    path: "/{name}",
    tags: ["Scripts"],
    summary: "Get a script",
    description: "Returns the script source code and metadata",
    request: { params: scriptNameParam },
    responses: {
      200: {
        description: "Script details",
        content: { "application/json": { schema: scriptDetailSchema } },
      },
      404: {
        description: "Script not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("name");
    const result = await getScript(name);
    if (!result) {
      return c.json({ error: `Script "${name}" not found` }, 404);
    }
    return c.json(result);
  },
);

// PUT /:name — Create or update a script
router.openapi(
  createRoute({
    method: "put",
    path: "/{name}",
    tags: ["Scripts"],
    summary: "Create or update a script",
    description:
      "Creates the script if it doesn't exist, updates it if it does. Code and description fields are supported.",
    request: {
      params: scriptNameParam,
      body: {
        content: { "application/json": { schema: scriptBodySchema } },
      },
    },
    responses: {
      200: {
        description: "Script saved",
        content: { "application/json": { schema: scriptEntrySchema } },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("name");
    const { code, description } = await c.req.json();

    try {
      // Try creating first; if exists, update
      const existing = await getScript(name);
      if (existing) {
        const entry = await updateScript(name, code, description);
        return c.json(entry);
      }
      const entry = await saveScript(name, code, description);
      return c.json(entry);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  },
);

// DELETE /:name — Delete a script
router.openapi(
  createRoute({
    method: "delete",
    path: "/{name}",
    tags: ["Scripts"],
    summary: "Delete a script",
    description: "Removes a script and its metadata",
    request: { params: scriptNameParam },
    responses: {
      200: {
        description: "Deletion result",
        content: {
          "application/json": {
            schema: z.object({ deleted: z.boolean() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("name");
    const deleted = await deleteScript(name);
    return c.json({ deleted });
  },
);

// POST /:name/run — Execute a script
router.openapi(
  createRoute({
    method: "post",
    path: "/{name}/run",
    tags: ["Scripts"],
    summary: "Execute a script",
    description:
      "Runs a stored script in a sandboxed VM, passing the provided args to main(args)",
    request: {
      params: scriptNameParam,
      body: {
        content: { "application/json": { schema: runRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "Execution result",
        content: { "application/json": { schema: runResultSchema } },
      },
      404: {
        description: "Script not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("name");
    const { args } = await c.req.json();
    const result = await executeScript(name, args);

    if (!result.success && result.error?.includes("not found")) {
      return c.json({ error: result.error }, 404);
    }

    return c.json(result);
  },
);

export default router;
