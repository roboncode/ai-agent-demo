import type { Context } from "hono";
import {
  listMemories,
  recallMemory,
  deleteMemory,
  clearMemories,
} from "../../storage/memory-store.js";

export async function handleListMemories(c: Context) {
  const memories = await listMemories();
  return c.json({ memories, count: memories.length }, 200);
}

export async function handleGetMemory(c: Context) {
  const id = c.req.param("id");
  const memory = await recallMemory(id);
  if (!memory) {
    return c.json({ error: "Memory not found" }, 404);
  }
  return c.json(memory, 200);
}

export async function handleDeleteMemory(c: Context) {
  const id = c.req.param("id");
  const deleted = await deleteMemory(id);
  if (!deleted) {
    return c.json({ error: "Memory not found" }, 404);
  }
  return c.json({ deleted: true as const, key: id }, 200);
}

export async function handleClearMemories(c: Context) {
  await clearMemories();
  return c.json({ cleared: true as boolean }, 200);
}
