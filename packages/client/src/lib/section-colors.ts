export const sectionBadgeClass: Record<string, string> = {
  "Introduction":           "badge-intro",
  "I. Foundations":         "badge-i",
  "II. From LLM to Agent":  "badge-ii",
  "III. Agent Patterns":    "badge-iii",
  "IV. Orchestration":      "badge-iv",
  "V. Production Concerns": "badge-v",
  "Conclusion":             "badge-conclusion",
};

export function badgeClass(section: string): string {
  return sectionBadgeClass[section] ?? "badge-i";
}

/** Hex accent color for each section — used by section-intro slides */
export const sectionAccentColor: Record<string, string> = {
  "I. Foundations":         "#34d8cc",
  "II. From LLM to Agent":  "#38bdf8",
  "III. Agent Patterns":    "#a78bfa",
  "IV. Orchestration":      "#fbbf24",
  "V. Production Concerns": "#fb7185",
};

/** RGB triplet for each section — used for rgba() backgrounds */
export const sectionAccentRgb: Record<string, string> = {
  "I. Foundations":         "52,216,204",
  "II. From LLM to Agent":  "56,189,248",
  "III. Agent Patterns":    "167,139,250",
  "IV. Orchestration":      "251,191,36",
  "V. Production Concerns": "251,113,133",
};

/** Extract the section numeral from a section string (e.g. "III. Agent Patterns" → "III") */
export function sectionNumeral(section: string): string {
  return section.split(".")[0]?.trim() ?? "";
}
