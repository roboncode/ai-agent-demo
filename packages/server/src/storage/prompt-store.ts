import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

const OVERRIDES_FILE = new URL(
  "../../data/prompt-overrides.json",
  import.meta.url,
).pathname;

export interface PromptOverride {
  prompt: string;
  updatedAt: string;
}

type OverridesData = Record<string, PromptOverride>;

let mutex: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  let result: Promise<T>;
  mutex = mutex
    .then(async () => {
      result = fn();
      await result;
    })
    .catch(() => {});
  return mutex.then(() => result!);
}

async function ensureFile() {
  const dir = dirname(OVERRIDES_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  if (!existsSync(OVERRIDES_FILE)) {
    await writeFile(OVERRIDES_FILE, JSON.stringify({}, null, 2));
  }
}

export async function loadOverrides(): Promise<OverridesData> {
  await ensureFile();
  const raw = await readFile(OVERRIDES_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveOverride(
  name: string,
  prompt: string,
): Promise<PromptOverride> {
  return withLock(async () => {
    const data = await loadOverrides();
    const entry: PromptOverride = {
      prompt,
      updatedAt: new Date().toISOString(),
    };
    data[name] = entry;
    await ensureFile();
    await writeFile(OVERRIDES_FILE, JSON.stringify(data, null, 2));
    return entry;
  });
}

export function deleteOverride(name: string): Promise<boolean> {
  return withLock(async () => {
    const data = await loadOverrides();
    if (!data[name]) return false;
    delete data[name];
    await ensureFile();
    await writeFile(OVERRIDES_FILE, JSON.stringify(data, null, 2));
    return true;
  });
}
