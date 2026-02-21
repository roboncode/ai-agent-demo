import type { Context } from "hono";
import {
  listNamespaces,
  listEntries,
  saveEntry,
  getEntry,
  deleteEntry,
  clearNamespace,
} from "../../storage/memory-store.js";

export async function handleListNamespaces(c: Context) {
  const namespaces = await listNamespaces();
  return c.json({ namespaces, count: namespaces.length }, 200);
}

export async function handleListEntries(c: Context) {
  const id = c.req.param("id");
  const entries = await listEntries(id);
  return c.json({ entries, count: entries.length }, 200);
}

export async function handleSaveEntry(c: Context) {
  const id = c.req.param("id");
  const { key, value, context } = await c.req.json();
  const entry = await saveEntry(id, key, value, context ?? "");
  return c.json(entry, 200);
}

export async function handleGetEntry(c: Context) {
  const id = c.req.param("id");
  const key = c.req.param("key");
  const entry = await getEntry(id, key);
  if (!entry) {
    return c.json({ error: "Entry not found" }, 404);
  }
  return c.json(entry, 200);
}

export async function handleDeleteEntry(c: Context) {
  const id = c.req.param("id");
  const key = c.req.param("key");
  const deleted = await deleteEntry(id, key);
  if (!deleted) {
    return c.json({ error: "Entry not found" }, 404);
  }
  return c.json({ deleted: true, namespace: id, key }, 200);
}

export async function handleClearNamespace(c: Context) {
  const id = c.req.param("id");
  await clearNamespace(id);
  return c.json({ cleared: true, namespace: id }, 200);
}
