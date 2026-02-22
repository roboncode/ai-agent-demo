export const sectionBadgeClass: Record<string, string> = {
  "Introduction":           "badge-intro",
  "I. Foundations":         "badge-i",
  "II. From LLM to Agent":  "badge-ii",
  "III. Agent Patterns":    "badge-iii",
  "IV. Orchestration":      "badge-iv",
  "V. Production Concerns": "badge-v",
  "VI. Beyond the Agent":   "badge-vi",
  "Conclusion":             "badge-conclusion",
};

export function badgeClass(section: string): string {
  return sectionBadgeClass[section] ?? "badge-i";
}

/** Hex accent color for each section — used by section-intro slides */
export const sectionAccentColor: Record<string, string> = {
  "Introduction":           "#94a3b8",
  "I. Foundations":         "#34d8cc",
  "II. From LLM to Agent":  "#38bdf8",
  "III. Agent Patterns":    "#a78bfa",
  "IV. Orchestration":      "#fbbf24",
  "V. Production Concerns": "#fb7185",
  "VI. Beyond the Agent":   "#f97316",
  "Conclusion":             "#34d399",
};

/** RGB triplet for each section — used for rgba() backgrounds */
export const sectionAccentRgb: Record<string, string> = {
  "Introduction":           "148,163,184",
  "I. Foundations":         "52,216,204",
  "II. From LLM to Agent":  "56,189,248",
  "III. Agent Patterns":    "167,139,250",
  "IV. Orchestration":      "251,191,36",
  "V. Production Concerns": "251,113,133",
  "VI. Beyond the Agent":   "249,115,22",
  "Conclusion":             "52,211,153",
};

/** Color per section for use in the intro roadmap */
export const sectionColors: [string, string][] = [
  ["I. Foundations",         "#34d8cc"],
  ["II. From LLM to Agent", "#38bdf8"],
  ["III. Agent Patterns",    "#a78bfa"],
  ["IV. Orchestration",      "#fbbf24"],
  ["V. Production Concerns", "#fb7185"],
  ["VI. Beyond the Agent",   "#f97316"],
];

/** Extract the section numeral from a section string (e.g. "III. Agent Patterns" → "III") */
export function sectionNumeral(section: string): string {
  return section.split(".")[0]?.trim() ?? "";
}
