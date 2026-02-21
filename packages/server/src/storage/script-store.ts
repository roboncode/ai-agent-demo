import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SCRIPTS_DIR = new URL("../../data/scripts", import.meta.url).pathname;
const META_SUFFIX = ".meta.json";
const NAME_REGEX = /^[a-z0-9][a-z0-9-]*$/;

export interface ScriptEntry {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

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

async function ensureDir() {
  if (!existsSync(SCRIPTS_DIR)) {
    await mkdir(SCRIPTS_DIR, { recursive: true });
  }
}

function validateName(name: string) {
  if (!NAME_REGEX.test(name)) {
    throw new Error(
      `Invalid script name "${name}". Must be lowercase alphanumeric with hyphens, no leading hyphen.`,
    );
  }
}

function scriptPath(name: string) {
  return join(SCRIPTS_DIR, `${name}.js`);
}

function metaPath(name: string) {
  return join(SCRIPTS_DIR, `${name}${META_SUFFIX}`);
}

export function scriptExists(name: string): boolean {
  return existsSync(scriptPath(name));
}

export function saveScript(
  name: string,
  code: string,
  description = "",
): Promise<ScriptEntry> {
  validateName(name);
  return withLock(async () => {
    await ensureDir();

    if (scriptExists(name)) {
      throw new Error(`Script "${name}" already exists. Use updateScript to modify it.`);
    }

    const now = new Date().toISOString();
    const entry: ScriptEntry = {
      name,
      description,
      createdAt: now,
      updatedAt: now,
    };

    await Promise.all([
      writeFile(scriptPath(name), code),
      writeFile(metaPath(name), JSON.stringify(entry, null, 2)),
    ]);

    return entry;
  });
}

export function getScript(
  name: string,
): Promise<{ entry: ScriptEntry; code: string } | null> {
  return withLock(async () => {
    await ensureDir();

    if (!scriptExists(name)) return null;

    const [code, raw] = await Promise.all([
      readFile(scriptPath(name), "utf-8"),
      readFile(metaPath(name), "utf-8"),
    ]);

    return { entry: JSON.parse(raw), code };
  });
}

export function updateScript(
  name: string,
  code?: string,
  description?: string,
): Promise<ScriptEntry> {
  return withLock(async () => {
    await ensureDir();

    if (!scriptExists(name)) {
      throw new Error(`Script "${name}" not found.`);
    }

    const raw = await readFile(metaPath(name), "utf-8");
    const entry: ScriptEntry = JSON.parse(raw);

    if (description !== undefined) entry.description = description;
    entry.updatedAt = new Date().toISOString();

    const writes: Promise<void>[] = [
      writeFile(metaPath(name), JSON.stringify(entry, null, 2)),
    ];
    if (code !== undefined) {
      writes.push(writeFile(scriptPath(name), code));
    }
    await Promise.all(writes);

    return entry;
  });
}

export function deleteScript(name: string): Promise<boolean> {
  return withLock(async () => {
    await ensureDir();

    if (!scriptExists(name)) return false;

    await Promise.all([unlink(scriptPath(name)), unlink(metaPath(name))]);
    return true;
  });
}

export async function listScripts(): Promise<ScriptEntry[]> {
  await ensureDir();

  const files = await readdir(SCRIPTS_DIR);
  const metaFiles = files.filter((f) => f.endsWith(META_SUFFIX));

  const entries: ScriptEntry[] = [];
  for (const file of metaFiles) {
    try {
      const raw = await readFile(join(SCRIPTS_DIR, file), "utf-8");
      entries.push(JSON.parse(raw));
    } catch {
      // Skip corrupted entries
    }
  }

  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
