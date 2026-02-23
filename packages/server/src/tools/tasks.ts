import { tool } from "ai";
import { z } from "zod";
import { toolRegistry } from "../registry/tool-registry.js";
import {
  createTask as storeCreateTask,
  listTasks as storeListTasks,
  updateTask as storeUpdateTask,
  deleteTask as storeDeleteTask,
} from "../storage/task-store.js";

const statusEnum = z.enum(["todo", "in-progress", "done"]);

export const createTaskTool = tool({
  description: "Create a new task on the board. It starts in the To Do column.",
  inputSchema: z.object({
    title: z.string().describe("The title of the task to create"),
  }),
  execute: async ({ title }) => {
    const task = await storeCreateTask(title);
    return task;
  },
});

export const listTasksTool = tool({
  description: "List all tasks on the board, optionally filtered by status column",
  inputSchema: z.object({
    status: statusEnum.optional().describe("Filter by status: todo, in-progress, or done"),
  }),
  execute: async ({ status }) => {
    let tasks = await storeListTasks();
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }
    return { tasks, count: tasks.length };
  },
});

export const updateTaskTool = tool({
  description: "Update a task — rename it or move it to a different column (todo, in-progress, done)",
  inputSchema: z.object({
    id: z.string().describe("The ID of the task to update"),
    title: z.string().optional().describe("New title for the task"),
    status: statusEnum.optional().describe("New status: todo, in-progress, or done"),
  }),
  execute: async ({ id, title, status }) => {
    const updates: { title?: string; status?: "todo" | "in-progress" | "done" } = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    const task = await storeUpdateTask(id, updates);
    return task;
  },
});

export const deleteTaskTool = tool({
  description: "Remove a task from the board permanently",
  inputSchema: z.object({
    id: z.string().describe("The ID of the task to delete"),
  }),
  execute: async ({ id }) => {
    const deleted = await storeDeleteTask(id);
    return { deleted, id };
  },
});

// Direct-call wrappers
export async function createTaskDirect(title: string) {
  return createTaskTool.execute!({ title }, { toolCallId: "direct" } as any);
}

export async function listTasksDirect(status?: "todo" | "in-progress" | "done") {
  return listTasksTool.execute!({ status }, { toolCallId: "direct" } as any);
}

export async function updateTaskDirect(id: string, updates: { title?: string; status?: "todo" | "in-progress" | "done" }) {
  return updateTaskTool.execute!({ id, ...updates }, { toolCallId: "direct" } as any);
}

export async function deleteTaskDirect(id: string) {
  return deleteTaskTool.execute!({ id }, { toolCallId: "direct" } as any);
}

// Self-registration
toolRegistry.register({
  name: "createTask",
  description: "Create a new task on the board",
  inputSchema: z.object({ title: z.string() }),
  tool: createTaskTool,
  directExecute: (input: { title: string }) => createTaskDirect(input.title),
  category: "tasks",
});

toolRegistry.register({
  name: "listTasks",
  description: "List all tasks on the board",
  inputSchema: z.object({ status: statusEnum.optional() }),
  tool: listTasksTool,
  directExecute: (input: { status?: "todo" | "in-progress" | "done" }) => listTasksDirect(input.status),
  category: "tasks",
});

toolRegistry.register({
  name: "updateTask",
  description: "Update a task on the board",
  inputSchema: z.object({ id: z.string(), title: z.string().optional(), status: statusEnum.optional() }),
  tool: updateTaskTool,
  directExecute: (input: { id: string; title?: string; status?: "todo" | "in-progress" | "done" }) =>
    updateTaskDirect(input.id, { title: input.title, status: input.status }),
  category: "tasks",
});

toolRegistry.register({
  name: "deleteTask",
  description: "Delete a task from the board",
  inputSchema: z.object({ id: z.string() }),
  tool: deleteTaskTool,
  directExecute: (input: { id: string }) => deleteTaskDirect(input.id),
  category: "tasks",
});
