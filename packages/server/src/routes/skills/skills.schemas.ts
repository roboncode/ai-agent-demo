import { z } from "zod";

export const skillMetaSchema = z.object({
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});

export const skillSchema = skillMetaSchema.extend({
  content: z.string(),
  rawContent: z.string(),
  updatedAt: z.string(),
});

export const skillCreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be kebab-case")
    .openapi({ example: "my-skill" }),
  content: z.string().min(1).openapi({
    example:
      "---\nname: my-skill\ndescription: Use when ...\ntags: [tag1]\n---\n# My Skill\n\n## Instructions\n...",
    description: "Full markdown content including frontmatter",
  }),
});

export const skillUpdateSchema = z.object({
  content: z.string().min(1).openapi({
    example:
      "---\nname: my-skill\ndescription: Use when ...\ntags: [tag1]\n---\n# My Skill\n\n## Instructions\n...",
    description: "Full markdown content including frontmatter",
  }),
});
