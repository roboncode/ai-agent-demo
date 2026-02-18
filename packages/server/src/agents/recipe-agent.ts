import { generateObject } from "ai";
import { z } from "zod";
import { getModel, extractUsage } from "../lib/ai-provider.js";

const SYSTEM_PROMPT = `You are a professional chef and recipe creator. When given a food topic or request, generate a complete, well-structured recipe.

Guidelines:
- Be specific with ingredient amounts and measurements
- Write clear, numbered step-by-step instructions
- Include practical cooking tips
- Set realistic prep/cook times and difficulty levels
- Adjust servings to reasonable defaults (usually 4)`;

export const recipeSchema = z.object({
  recipe: z.object({
    name: z.string().describe("The name of the recipe"),
    description: z.string().describe("A short appetizing description"),
    prepTime: z.string().describe("Preparation time (e.g. '15 minutes')"),
    cookTime: z.string().describe("Cooking time (e.g. '30 minutes')"),
    servings: z.number().describe("Number of servings"),
    difficulty: z.enum(["easy", "medium", "hard"]),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
        notes: z.string().describe("Additional notes, or empty string if none"),
      })
    ),
    steps: z.array(
      z.object({
        step: z.number(),
        instruction: z.string(),
      })
    ),
    tips: z.array(z.string()).describe("Practical cooking tips"),
  }),
});

export type Recipe = z.infer<typeof recipeSchema>;

export async function runRecipeAgent(message: string, model?: string) {
  const startTime = performance.now();

  const result = await generateObject({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    schema: recipeSchema,
  });

  const usage = extractUsage(result, startTime);

  return {
    ...result.object,
    usage,
  };
}
