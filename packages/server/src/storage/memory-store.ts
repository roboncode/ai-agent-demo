import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

const MEMORY_FILE = new URL("../../data/memory.json", import.meta.url).pathname;

export interface MemoryEntry {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

type MemoryData = Record<string, MemoryEntry>;

// Mutex to serialize all read-modify-write operations
let mutex: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  let result: Promise<T>;
  mutex = mutex.then(async () => {
    result = fn();
    await result;
  }).catch(() => {
    // Ensure the chain doesn't break on errors
  });
  return mutex.then(() => result!);
}

async function ensureFile() {
  const dir = dirname(MEMORY_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  if (!existsSync(MEMORY_FILE)) {
    await writeFile(MEMORY_FILE, JSON.stringify({}, null, 2));
  }
}

async function readMemories(): Promise<MemoryData> {
  await ensureFile();
  const raw = await readFile(MEMORY_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    await writeFile(MEMORY_FILE, JSON.stringify({}, null, 2));
    return {};
  }
}

async function writeMemories(data: MemoryData): Promise<void> {
  await ensureFile();
  await writeFile(MEMORY_FILE, JSON.stringify(data, null, 2));
}

export function saveMemory(key: string, value: string): Promise<MemoryEntry> {
  return withLock(async () => {
    const data = await readMemories();
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      key,
      value,
      createdAt: data[key]?.createdAt ?? now,
      updatedAt: now,
    };
    data[key] = entry;
    await writeMemories(data);
    return entry;
  });
}

export async function recallMemory(key: string): Promise<MemoryEntry | null> {
  const data = await readMemories();
  return data[key] ?? null;
}

export async function listMemories(): Promise<MemoryEntry[]> {
  const data = await readMemories();
  return Object.values(data);
}

export function deleteMemory(key: string): Promise<boolean> {
  return withLock(async () => {
    const data = await readMemories();
    if (!data[key]) return false;
    delete data[key];
    await writeMemories(data);
    return true;
  });
}

export function clearMemories(): Promise<void> {
  return withLock(async () => {
    await writeMemories({});
  });
}
