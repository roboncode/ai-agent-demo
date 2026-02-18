import type { Context } from "hono";
import { runWeatherAgent } from "../../agents/weather-agent.js";
import { runHackernewsAgent } from "../../agents/hackernews-agent.js";
import { runKnowledgeAgent } from "../../agents/knowledge-agent.js";
import { runSupervisorAgent } from "../../agents/supervisor-agent.js";
import { runMemoryAgent } from "../../agents/memory-agent.js";
import {
  runHumanInLoopAgent,
  approveAction,
} from "../../agents/human-in-loop-agent.js";
import { runTaskAgent } from "../../agents/task-agent.js";
import { runCodingAgent } from "../../agents/coding-agent.js";

function conversationId(existing?: string) {
  return existing ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function handleWeatherAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runWeatherAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) });
}

export async function handleHackernewsAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runHackernewsAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) });
}

export async function handleKnowledgeAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runKnowledgeAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) });
}

export async function handleSupervisorAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runSupervisorAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) });
}

export async function handleMemoryAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runMemoryAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) });
}

export async function handleHumanInLoopAgent(c: Context) {
  const { message, model } = await c.req.json();
  const result = await runHumanInLoopAgent(message, model);
  return c.json(result);
}

export async function handleHumanInLoopApprove(c: Context) {
  const { id, approved } = await c.req.json();
  const result = await approveAction(id, approved);
  return c.json(result);
}

export async function handleTaskAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runTaskAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) });
}

export async function handleCodingAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runCodingAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) });
}
