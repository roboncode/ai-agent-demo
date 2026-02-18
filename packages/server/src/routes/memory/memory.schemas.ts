import { z } from "zod";

export const memoryEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
