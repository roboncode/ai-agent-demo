import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const MEMORY_DIR = new URL("../../data/memory", import.meta.url).pathname;

export interface MemoryEntry {
  key: string;
  value: string;
  context: string;
  createdAt: string;
  updatedAt: string;
}

type NamespaceData = Record<string, MemoryEntry>;

// Per-namespace mutex locking
const locks = new Map<string, Promise<void>>();

function withLock<T>(namespace: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(namespace) ?? Promise.resolve();
  let result: Promise<T>;
  const next = prev
    .then(async () => {
      result = fn();
      await result;
    })
    .catch(() => {});
  locks.set(namespace, next);
  return next.then(() => result!);
}

function namespacePath(namespaceId: string): string {
  return join(MEMORY_DIR, `${namespaceId}.json`);
}

async function ensureDir() {
  if (!existsSync(MEMORY_DIR)) {
    await mkdir(MEMORY_DIR, { recursive: true });
  }
}

async function readNamespace(namespaceId: string): Promise<NamespaceData> {
  await ensureDir();
  const path = namespacePath(namespaceId);
  if (!existsSync(path)) return {};
  const raw = await readFile(path, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeNamespace(namespaceId: string, data: NamespaceData): Promise<void> {
  await ensureDir();
  await writeFile(namespacePath(namespaceId), JSON.stringify(data, null, 2));
}

// --- Public API ---

export async function listNamespaces(): Promise<string[]> {
  await ensureDir();
  const files = await readdir(MEMORY_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

export async function listEntries(namespaceId: string): Promise<MemoryEntry[]> {
  const data = await readNamespace(namespaceId);
  return Object.values(data);
}

export function saveEntry(
  namespaceId: string,
  key: string,
  value: string,
  context = "",
): Promise<MemoryEntry> {
  return withLock(namespaceId, async () => {
    const data = await readNamespace(namespaceId);
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      key,
      value,
      context,
      createdAt: data[key]?.createdAt ?? now,
      updatedAt: now,
    };
    data[key] = entry;
    await writeNamespace(namespaceId, data);
    return entry;
  });
}

export async function getEntry(
  namespaceId: string,
  key: string,
): Promise<MemoryEntry | null> {
  const data = await readNamespace(namespaceId);
  return data[key] ?? null;
}

export function deleteEntry(
  namespaceId: string,
  key: string,
): Promise<boolean> {
  return withLock(namespaceId, async () => {
    const data = await readNamespace(namespaceId);
    if (!data[key]) return false;
    delete data[key];
    await writeNamespace(namespaceId, data);
    return true;
  });
}

export function clearNamespace(namespaceId: string): Promise<void> {
  return withLock(namespaceId, async () => {
    const path = namespacePath(namespaceId);
    if (existsSync(path)) {
      await unlink(path);
    }
  });
}

export async function loadMemoriesForIds(
  ids: string[],
): Promise<Array<MemoryEntry & { namespace: string }>> {
  const results: Array<MemoryEntry & { namespace: string }> = [];
  await Promise.all(
    ids.map(async (id) => {
      const entries = await listEntries(id);
      for (const entry of entries) {
        results.push({ ...entry, namespace: id });
      }
    }),
  );
  return results;
}

// --- Backward-compatible wrappers (used by memory-agent tools) ---

const DEFAULT_NS = "default";

export function saveMemory(key: string, value: string, context = ""): Promise<MemoryEntry> {
  return saveEntry(DEFAULT_NS, key, value, context);
}

export async function recallMemory(key: string): Promise<MemoryEntry | null> {
  return getEntry(DEFAULT_NS, key);
}

export async function listMemories(): Promise<MemoryEntry[]> {
  return listEntries(DEFAULT_NS);
}

export function deleteMemory(key: string): Promise<boolean> {
  return deleteEntry(DEFAULT_NS, key);
}

export function clearMemories(): Promise<void> {
  return clearNamespace(DEFAULT_NS);
}
