import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const DATA_DIR = new URL("../../data", import.meta.url).pathname;
const TASKS_FILE = `${DATA_DIR}/tasks.json`;

export interface Task {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  createdAt: string;
  updatedAt: string;
}

type TaskData = Task[];

// Mutex locking
let lock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = lock;
  let result: Promise<T>;
  const next = prev
    .then(async () => {
      result = fn();
      await result;
    })
    .catch(() => {});
  lock = next;
  return next.then(() => result!);
}

async function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readTasks(): Promise<TaskData> {
  await ensureDir();
  if (!existsSync(TASKS_FILE)) return [];
  const raw = await readFile(TASKS_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeTasks(data: TaskData): Promise<void> {
  await ensureDir();
  await writeFile(TASKS_FILE, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return Date.now().toString(36);
}

// --- Public API ---

export function createTask(title: string): Promise<Task> {
  return withLock(async () => {
    const tasks = await readTasks();
    const now = new Date().toISOString();
    const task: Task = {
      id: generateId(),
      title,
      status: "todo",
      createdAt: now,
      updatedAt: now,
    };
    tasks.push(task);
    await writeTasks(tasks);
    return task;
  });
}

export async function listTasks(): Promise<Task[]> {
  return readTasks();
}

export function updateTask(
  id: string,
  updates: { title?: string; status?: "todo" | "in-progress" | "done" },
): Promise<Task> {
  return withLock(async () => {
    const tasks = await readTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Task not found: ${id}`);
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.status !== undefined) task.status = updates.status;
    task.updatedAt = new Date().toISOString();
    await writeTasks(tasks);
    return task;
  });
}

export function deleteTask(id: string): Promise<boolean> {
  return withLock(async () => {
    const tasks = await readTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    tasks.splice(index, 1);
    await writeTasks(tasks);
    return true;
  });
}
