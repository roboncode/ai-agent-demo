import { createSignal, For, Show, type Component } from "solid-js";
import { getJson, postJson, putJson, deleteJson } from "../lib/api";
import JsonView from "./shared/JsonView.tsx";

interface SkillMeta {
  name: string;
  description?: string;
  phase?: string;
}

const sampleSkills = [
  {
    name: "concise",
    content: `---
description: Respond concisely
phase: response
---
# Instructions
Keep all responses under 3 sentences. Be direct and avoid filler words.`,
  },
  {
    name: "formal-tone",
    content: `---
description: Use formal language
phase: response
---
# Instructions
Use professional, formal language. Avoid contractions, slang, and casual expressions.`,
  },
  {
    name: "step-by-step",
    content: `---
description: Break down answers into numbered steps
phase: response
---
# Instructions
Structure every answer as numbered steps. Start each step with an action verb.`,
  },
];

const SkillsPanel: Component = () => {
  const [skills, setSkills] = createSignal<SkillMeta[]>([]);
  const [result, setResult] = createSignal<unknown>(null);
  const [activeAction, setActiveAction] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [message, setMessage] = createSignal("");

  async function run(label: string, fn: () => Promise<void>) {
    setLoading(true);
    setError("");
    setMessage("");
    setResult(null);
    setActiveAction(label);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function listSkills() {
    const data = await getJson<{ skills: SkillMeta[] }>("/api/skills");
    setSkills(data.skills);
    setResult(data);
  }

  listSkills();

  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Skills</h2>

      <div class="space-y-2">
        <p class="text-sm text-gray-400">Create Sample Skills</p>
        <div class="flex flex-wrap gap-2">
          <For each={sampleSkills}>
            {(skill) => (
              <button
                class="rounded px-3 py-2 text-sm font-medium border bg-green-900/50 border-green-800 text-green-300 hover:bg-green-800/50 disabled:opacity-50"
                onClick={() =>
                  run(`Create "${skill.name}"`, async () => {
                    await postJson("/api/skills", {
                      name: skill.name,
                      content: skill.content,
                    });
                    setMessage(`Created skill "${skill.name}"`);
                    await listSkills();
                  })
                }
                disabled={loading()}
              >
                Create "{skill.name}"
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-sm text-gray-400">Actions</p>
        <div class="flex flex-wrap gap-2">
          <button
            class="rounded px-3 py-2 text-sm font-medium border bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            onClick={() => run("List skills", listSkills)}
            disabled={loading()}
          >
            Refresh List
          </button>
          <For each={skills()}>
            {(skill) => (
              <>
                <button
                  class="rounded px-3 py-2 text-sm font-medium border bg-blue-900/50 border-blue-800 text-blue-300 hover:bg-blue-800/50 disabled:opacity-50"
                  onClick={() =>
                    run(`View "${skill.name}"`, async () => {
                      const data = await getJson(`/api/skills/${skill.name}`);
                      setResult(data);
                    })
                  }
                  disabled={loading()}
                >
                  View "{skill.name}"
                </button>
                <button
                  class="rounded px-3 py-2 text-sm font-medium border bg-amber-900/50 border-amber-800 text-amber-300 hover:bg-amber-800/50 disabled:opacity-50"
                  onClick={() =>
                    run(`Update "${skill.name}"`, async () => {
                      await putJson(`/api/skills/${skill.name}`, {
                        content: `---\ndescription: Updated skill\nphase: response\n---\n# Updated Instructions\nThis skill was updated by the test client at ${new Date().toLocaleTimeString()}.`,
                      });
                      setMessage(`Updated skill "${skill.name}"`);
                      await listSkills();
                    })
                  }
                  disabled={loading()}
                >
                  Update "{skill.name}"
                </button>
                <button
                  class="rounded px-3 py-2 text-sm font-medium border bg-red-900/50 border-red-800 text-red-300 hover:bg-red-800/50 disabled:opacity-50"
                  onClick={() =>
                    run(`Delete "${skill.name}"`, async () => {
                      await deleteJson(`/api/skills/${skill.name}`);
                      setMessage(`Deleted skill "${skill.name}"`);
                      await listSkills();
                    })
                  }
                  disabled={loading()}
                >
                  Delete "{skill.name}"
                </button>
              </>
            )}
          </For>
        </div>
      </div>

      <Show when={skills().length > 0}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">{skills().length} skill(s)</p>
          <For each={skills()}>
            {(skill) => (
              <div class="rounded bg-gray-900 px-3 py-2 text-sm border border-gray-800">
                <span class="font-medium text-blue-400">{skill.name}</span>
                <Show when={skill.phase}>
                  <span class="text-xs text-gray-500 ml-2">({skill.phase})</span>
                </Show>
                <Show when={skill.description}>
                  <span class="text-gray-500 ml-2">{skill.description}</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {error() && <p class="text-sm text-red-400">{error()}</p>}
      {message() && <p class="text-sm text-green-400">{message()}</p>}
      <Show when={result()}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">Result: {activeAction()}</p>
          <JsonView data={result()} />
        </div>
      </Show>
    </div>
  );
};

export default SkillsPanel;
