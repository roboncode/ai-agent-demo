import { type Component, For, createSignal, createMemo, Show } from "solid-js";
import { slides } from "../data/slides";
import { sectionAccentColor } from "../lib/section-colors";
import { FiChevronDown, FiX } from "solid-icons/fi";

interface Props {
  open: boolean;
  current: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

interface SectionGroup {
  section: string;
  color: string;
  slides: { index: number; title: string; layout?: string }[];
}

function buildSections(): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let current: SectionGroup | null = null;

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (!current || current.section !== s.section) {
      current = {
        section: s.section,
        color: sectionAccentColor[s.section] ?? "#a0a0b8",
        slides: [],
      };
      groups.push(current);
    }
    current.slides.push({ index: i, title: s.title, layout: s.layout });
  }

  return groups;
}

const sections = buildSections();

const TableOfContents: Component<Props> = (props) => {
  // Track which sections are collapsed (all expanded by default)
  const [collapsed, setCollapsed] = createSignal<Record<string, boolean>>({});

  const currentSection = createMemo(() => slides[props.current]?.section ?? "");

  function toggleSection(section: string) {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function handleSlideClick(index: number) {
    props.onNavigate(index);
    props.onClose();
  }

  // Short labels for section headers (strip numeral prefix for display beneath)
  function sectionLabel(section: string): string {
    const dot = section.indexOf(".");
    return dot > -1 ? section.slice(dot + 1).trim() : section;
  }

  function sectionNumeral(section: string): string {
    const dot = section.indexOf(".");
    return dot > -1 ? section.slice(0, dot).trim() : "";
  }

  return (
    <>
      {/* Backdrop */}
      <div
        class="toc-backdrop"
        classList={{ "toc-backdrop-visible": props.open }}
        onClick={props.onClose}
      />

      {/* Panel */}
      <div
        class="toc-panel"
        classList={{ "toc-panel-open": props.open }}
      >
        {/* Header */}
        <div class="flex items-center justify-between px-5 pt-5 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(52,216,204,0.5)]" />
            <span class="font-display text-xs font-bold tracking-[0.15em] text-secondary uppercase">
              Contents
            </span>
          </div>
          <button
            onClick={props.onClose}
            class="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:text-primary"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Section list */}
        <div class="toc-scroll flex-1 overflow-y-auto px-3 pb-6">
          <For each={sections}>
            {(group) => {
              const isCollapsed = () => collapsed()[group.section] ?? false;
              const isCurrent = () => currentSection() === group.section;
              const numeral = sectionNumeral(group.section);
              const label = sectionLabel(group.section);

              return (
                <div class="mb-1">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(group.section)}
                    class="toc-section-header group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors"
                    style={{
                      "--toc-accent": group.color,
                    }}
                  >
                    {/* Color pip */}
                    <div
                      class="h-2 w-2 flex-shrink-0 rounded-full transition-shadow"
                      style={{
                        "background-color": group.color,
                        "box-shadow": isCurrent()
                          ? `0 0 8px ${group.color}60`
                          : "none",
                      }}
                    />

                    {/* Numeral */}
                    <Show when={numeral}>
                      <span
                        class="font-mono text-xs font-bold opacity-60"
                        style={{ color: group.color }}
                      >
                        {numeral}
                      </span>
                    </Show>

                    {/* Label */}
                    <span
                      class="flex-1 font-display text-sm font-medium transition-colors"
                      classList={{
                        "text-primary": isCurrent(),
                        "text-secondary group-hover:text-primary": !isCurrent(),
                      }}
                    >
                      {label}
                    </span>

                    {/* Slide count */}
                    <span class="font-mono text-xs text-muted mr-1">
                      {group.slides.length}
                    </span>

                    {/* Chevron */}
                    <FiChevronDown
                      size={14}
                      class="text-muted transition-transform duration-200"
                      style={{
                        transform: isCollapsed() ? "rotate(-90deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {/* Slide list */}
                  <div
                    class="toc-slides-container overflow-hidden transition-all duration-200"
                    style={{
                      "max-height": isCollapsed() ? "0px" : `${group.slides.length * 40}px`,
                      opacity: isCollapsed() ? "0" : "1",
                    }}
                  >
                    <For each={group.slides}>
                      {(slide) => {
                        const isActive = () => slide.index === props.current;
                        const isSectionIntro = () =>
                          slide.layout === "section-intro" ||
                          slide.layout === "intro" ||
                          slide.layout === "conclusion";

                        return (
                          <button
                            onClick={() => handleSlideClick(slide.index)}
                            class="toc-slide-item group flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-all duration-150"
                            classList={{
                              "toc-slide-active": isActive(),
                            }}
                            style={{
                              "--toc-accent": group.color,
                            }}
                          >
                            {/* Index pip / active marker */}
                            <div class="flex w-5 flex-shrink-0 items-center justify-end">
                              <Show
                                when={isActive()}
                                fallback={
                                  <span class="font-mono text-[10px] text-secondary/50">
                                    {String(slide.index + 1).padStart(2, "0")}
                                  </span>
                                }
                              >
                                <div
                                  class="h-1 w-3 rounded-full"
                                  style={{
                                    "background-color": group.color,
                                    "box-shadow": `0 0 8px ${group.color}50`,
                                  }}
                                />
                              </Show>
                            </div>

                            {/* Title */}
                            <span
                              class="flex-1 truncate text-[13px] transition-colors duration-150"
                              classList={{
                                "font-medium": isActive() || isSectionIntro(),
                                "text-primary": isActive(),
                                "text-secondary": isSectionIntro() && !isActive(),
                                "text-secondary/70 group-hover:text-primary": !isActive() && !isSectionIntro(),
                              }}
                            >
                              {slide.title}
                            </span>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        {/* Footer */}
        <div class="flex items-center justify-between border-t border-border-subtle px-5 py-3">
          <span class="font-mono text-[11px] text-muted">
            {slides.length} slides
          </span>
          <kbd class="rounded border border-border-subtle bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">
            T
          </kbd>
        </div>
      </div>
    </>
  );
};

export default TableOfContents;
