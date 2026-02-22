import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIR = new URL("../../data/skills", import.meta.url).pathname;

export type SkillPhase = "query" | "response" | "both";

const VALID_PHASES = new Set<SkillPhase>(["query", "response", "both"]);

export interface SkillMeta {
  name: string;
  description: string;
  tags: string[];
  phase: SkillPhase;
}

export interface Skill extends SkillMeta {
  content: string;
  rawContent: string;
  updatedAt: string;
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Per-skill mutex locking
const locks = new Map<string, Promise<void>>();

function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(name) ?? Promise.resolve();
  let result: Promise<T>;
  const next = prev
    .then(async () => {
      result = fn();
      await result;
    })
    .catch(() => {});
  locks.set(name, next);
  return next.then(() => result!);
}

function skillDir(name: string): string {
  return join(SKILLS_DIR, name);
}

function readmePath(name: string): string {
  return join(SKILLS_DIR, name, "README.md");
}

async function ensureDir() {
  if (!existsSync(SKILLS_DIR)) {
    await mkdir(SKILLS_DIR, { recursive: true });
  }
}

/** Simple frontmatter parser — handles `key: value` and `key: [a, b]` */
export function parseFrontmatter(raw: string): {
  meta: Record<string, string | string[]>;
  body: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string | string[]> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // Array values: [a, b, c]
    const arrMatch = value.match(/^\[(.*)\]$/);
    if (arrMatch) {
      meta[key] = arrMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      meta[key] = value;
    }
  }

  return { meta, body: match[2] };
}

function parsePhase(value: unknown): SkillPhase {
  if (typeof value === "string" && VALID_PHASES.has(value as SkillPhase)) {
    return value as SkillPhase;
  }
  return "response";
}

function buildSkill(name: string, raw: string): Skill {
  const { meta, body } = parseFrontmatter(raw);
  return {
    name: (meta.name as string) || name,
    description: (meta.description as string) || "",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    phase: parsePhase(meta.phase),
    content: body.trim(),
    rawContent: raw,
    updatedAt: new Date().toISOString(),
  };
}

// --- Public API ---

export async function listSkills(): Promise<SkillMeta[]> {
  await ensureDir();
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills: SkillMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const readme = readmePath(entry.name);
    if (!existsSync(readme)) continue;
    const raw = await readFile(readme, "utf-8");
    const { meta } = parseFrontmatter(raw);
    skills.push({
      name: (meta.name as string) || entry.name,
      description: (meta.description as string) || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      phase: parsePhase(meta.phase),
    });
  }

  return skills;
}

export async function getSkill(name: string): Promise<Skill | null> {
  await ensureDir();
  const path = readmePath(name);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return buildSkill(name, raw);
}

export function createSkill(name: string, content: string): Promise<Skill> {
  if (!KEBAB_CASE.test(name)) {
    throw new Error(`Invalid skill name "${name}": must be kebab-case (e.g. "my-skill")`);
  }

  return withLock(name, async () => {
    await ensureDir();
    const dir = skillDir(name);
    if (existsSync(dir)) {
      throw new Error(`Skill "${name}" already exists`);
    }
    await mkdir(dir, { recursive: true });
    await writeFile(readmePath(name), content, "utf-8");
    return buildSkill(name, content);
  });
}

export function updateSkill(name: string, content: string): Promise<Skill> {
  return withLock(name, async () => {
    await ensureDir();
    const path = readmePath(name);
    if (!existsSync(path)) {
      throw new Error(`Skill "${name}" not found`);
    }
    await writeFile(path, content, "utf-8");
    return buildSkill(name, content);
  });
}

export function deleteSkill(name: string): Promise<boolean> {
  return withLock(name, async () => {
    await ensureDir();
    const dir = skillDir(name);
    if (!existsSync(dir)) return false;
    await rm(dir, { recursive: true });
    return true;
  });
}

export async function getSkillSummaries(): Promise<string> {
  const skills = await listSkills();
  if (skills.length === 0) return "No skills available.";
  return skills.map((s) => `- ${s.name} [${s.phase}]: ${s.description}`).join("\n");
}
