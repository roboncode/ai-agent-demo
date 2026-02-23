import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import type { PromptStore, PromptOverride } from "../interfaces.js";

export function createPromptStore(dataDir: string): PromptStore {
  const overridesFile = `${dataDir}/prompt-overrides.json`;

  let mutex: Promise<void> = Promise.resolve();
  function withLock<T>(fn: () => Promise<T>): Promise<T> {
    let result: Promise<T>;
    mutex = mutex
      .then(async () => { result = fn(); await result; })
      .catch(() => {});
    return mutex.then(() => result!);
  }

  async function ensureFile() {
    const dir = dirname(overridesFile);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    if (!existsSync(overridesFile)) await writeFile(overridesFile, JSON.stringify({}, null, 2));
  }

  return {
    async loadOverrides() {
      await ensureFile();
      const raw = await readFile(overridesFile, "utf-8");
      try { return JSON.parse(raw); } catch { return {}; }
    },

    saveOverride(name, prompt) {
      return withLock(async () => {
        await ensureFile();
        const raw = await readFile(overridesFile, "utf-8");
        const data: Record<string, PromptOverride> = JSON.parse(raw).constructor === Object ? JSON.parse(raw) : {};
        const entry: PromptOverride = { prompt, updatedAt: new Date().toISOString() };
        data[name] = entry;
        await writeFile(overridesFile, JSON.stringify(data, null, 2));
        return entry;
      });
    },

    deleteOverride(name) {
      return withLock(async () => {
        await ensureFile();
        const raw = await readFile(overridesFile, "utf-8");
        const data: Record<string, PromptOverride> = JSON.parse(raw).constructor === Object ? JSON.parse(raw) : {};
        if (!data[name]) return false;
        delete data[name];
        await writeFile(overridesFile, JSON.stringify(data, null, 2));
        return true;
      });
    },
  };
}
