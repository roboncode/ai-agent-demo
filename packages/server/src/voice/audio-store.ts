import { readFile, writeFile, mkdir, readdir, unlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const AUDIO_DIR = new URL("../../data/audio", import.meta.url).pathname;
const META_SUFFIX = ".meta.json";

export interface AudioEntry {
  id: string;
  mimeType: string;
  size: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

async function ensureDir() {
  if (!existsSync(AUDIO_DIR)) {
    await mkdir(AUDIO_DIR, { recursive: true });
  }
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

function extension(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/aac": "aac",
    "audio/flac": "flac",
  };
  return map[mimeType] ?? "bin";
}

export async function saveAudio(
  buffer: Buffer | Uint8Array,
  mimeType: string,
  metadata?: Record<string, unknown>,
): Promise<AudioEntry> {
  await ensureDir();

  const id = generateId();
  const ext = extension(mimeType);
  const audioPath = join(AUDIO_DIR, `${id}.${ext}`);
  const metaPath = join(AUDIO_DIR, `${id}${META_SUFFIX}`);

  const entry: AudioEntry = {
    id,
    mimeType,
    size: buffer.length,
    createdAt: new Date().toISOString(),
    metadata,
  };

  await Promise.all([
    writeFile(audioPath, buffer),
    writeFile(metaPath, JSON.stringify(entry, null, 2)),
  ]);

  return entry;
}

export async function getAudio(
  id: string,
): Promise<{ entry: AudioEntry; data: Buffer } | null> {
  await ensureDir();

  // Find the audio file by matching the id prefix
  const files = await readdir(AUDIO_DIR);
  const metaFile = files.find((f) => f.startsWith(id) && f.endsWith(META_SUFFIX));

  if (!metaFile) return null;

  const metaPath = join(AUDIO_DIR, metaFile);
  const raw = await readFile(metaPath, "utf-8");
  const entry: AudioEntry = JSON.parse(raw);

  const audioFile = files.find((f) => f.startsWith(id) && !f.endsWith(META_SUFFIX));
  if (!audioFile) return null;

  const data = await readFile(join(AUDIO_DIR, audioFile));
  return { entry, data };
}

export async function deleteAudio(id: string): Promise<boolean> {
  await ensureDir();

  const files = await readdir(AUDIO_DIR);
  const matching = files.filter((f) => f.startsWith(id));

  if (matching.length === 0) return false;

  await Promise.all(matching.map((f) => unlink(join(AUDIO_DIR, f))));
  return true;
}

export async function listAudio(): Promise<AudioEntry[]> {
  await ensureDir();

  const files = await readdir(AUDIO_DIR);
  const metaFiles = files.filter((f) => f.endsWith(META_SUFFIX));

  const entries: AudioEntry[] = [];
  for (const metaFile of metaFiles) {
    try {
      const raw = await readFile(join(AUDIO_DIR, metaFile), "utf-8");
      entries.push(JSON.parse(raw));
    } catch {
      // Skip corrupted entries
    }
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function cleanupOlderThan(maxAgeMs: number): Promise<number> {
  await ensureDir();

  const cutoff = Date.now() - maxAgeMs;
  const entries = await listAudio();
  let deleted = 0;

  for (const entry of entries) {
    if (new Date(entry.createdAt).getTime() < cutoff) {
      await deleteAudio(entry.id);
      deleted++;
    }
  }

  return deleted;
}
