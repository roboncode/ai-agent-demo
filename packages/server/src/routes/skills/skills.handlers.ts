import type { Context } from "hono";
import {
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
} from "../../storage/skill-store.js";

export async function handleListSkills(c: Context) {
  const skills = await listSkills();
  return c.json({ skills, count: skills.length }, 200);
}

export async function handleGetSkill(c: Context) {
  const name = c.req.param("name");
  const skill = await getSkill(name);
  if (!skill) {
    return c.json({ error: "Skill not found" }, 404);
  }
  return c.json(skill, 200);
}

export async function handleCreateSkill(c: Context) {
  const { name, content } = await c.req.json();
  try {
    const skill = await createSkill(name, content);
    return c.json(skill, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
}

export async function handleUpdateSkill(c: Context) {
  const name = c.req.param("name");
  const { content } = await c.req.json();
  try {
    const skill = await updateSkill(name, content);
    return c.json(skill, 200);
  } catch (err: any) {
    return c.json({ error: err.message }, 404);
  }
}

export async function handleDeleteSkill(c: Context) {
  const name = c.req.param("name");
  const deleted = await deleteSkill(name);
  if (!deleted) {
    return c.json({ error: "Skill not found" }, 404);
  }
  return c.json({ deleted: true, name }, 200);
}
