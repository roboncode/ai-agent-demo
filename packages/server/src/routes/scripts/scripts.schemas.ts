import { z } from "zod";

export const scriptNameParam = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).openapi({
    example: "compound-interest",
    description: "Script name (lowercase alphanumeric with hyphens)",
  }),
});

export const scriptBodySchema = z.object({
  code: z.string().openapi({
    example: 'export default function main(args) {\n  return { result: args.x + args.y };\n}',
    description: "JavaScript source code with a main(args) entry point",
  }),
  description: z.string().optional().openapi({
    example: "Adds two numbers together",
    description: "Brief description of what the script does",
  }),
});

export const scriptEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scriptDetailSchema = z.object({
  entry: scriptEntrySchema,
  code: z.string(),
});

export const scriptListSchema = z.object({
  scripts: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      updatedAt: z.string(),
    }),
  ),
  count: z.number(),
});

export const runRequestSchema = z.object({
  args: z.record(z.string(), z.unknown()).optional().openapi({
    example: { principal: 1000, rate: 0.05, years: 10 },
    description: "Arguments object passed to main(args)",
  }),
});

export const runResultSchema = z.object({
  success: z.boolean(),
  returnValue: z.any().optional(),
  output: z.string().optional(),
  errors: z.string().optional(),
  error: z.string().optional(),
});
