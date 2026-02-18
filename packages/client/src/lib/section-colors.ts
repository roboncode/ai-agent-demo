export const sectionBadgeClass: Record<string, string> = {
  "I. Foundations":         "badge-i",
  "II. From LLM to Agent":  "badge-ii",
  "III. Agent Patterns":    "badge-iii",
  "IV. Orchestration":      "badge-iv",
  "V. Production Concerns": "badge-v",
};

export function badgeClass(section: string): string {
  return sectionBadgeClass[section] ?? "badge-i";
}
