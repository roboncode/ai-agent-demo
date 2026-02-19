import type { Component } from "solid-js";
import {
  FiGlobe,
  FiLayers,
  FiFileText,
  FiServer,
  FiSearch,
  FiLock,
} from "solid-icons/fi";
import type { IconTypes } from "solid-icons";

interface SourceBlock {
  icon: IconTypes;
  name: string;
  desc: string;
  color: string;
}

const SOURCES: SourceBlock[] = [
  { icon: FiGlobe,    name: "External APIs",   desc: "live weather, prices, news",   color: "52,216,204"  },
  { icon: FiLayers,   name: "Vector Databases", desc: "semantic similarity search",   color: "192,132,252" },
  { icon: FiFileText, name: "Files & Docs",     desc: "PDFs, markdown, text files",   color: "34,211,238"  },
  { icon: FiServer,   name: "SQL Databases",    desc: "structured business data",     color: "245,158,11"  },
  { icon: FiSearch,   name: "Web Search",       desc: "real-time results",            color: "74,222,128"  },
  { icon: FiLock,     name: "Private Knowledge", desc: "internal wikis & docs",       color: "248,113,113" },
];

const Slide7Visual: Component = () => {
  return (
    <div class="mt-6 grid grid-cols-2 gap-3">
      {SOURCES.map((s) => (
        <div
          class="flex items-start gap-3 rounded-xl px-4 py-3.5"
          style={{
            background: `rgba(${s.color}, 0.07)`,
            border: `1px solid rgba(${s.color}, 0.22)`,
          }}
        >
          <div
            class="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `rgba(${s.color}, 0.12)`,
              border: `1px solid rgba(${s.color}, 0.25)`,
            }}
          >
            <s.icon size={19} style={{ color: `rgba(${s.color}, 1)` }} />
          </div>
          <div>
            <div
              class="font-mono text-[14px] font-semibold leading-tight"
              style={{ color: `rgba(${s.color}, 1)` }}
            >
              {s.name}
            </div>
            <div class="mt-0.5 font-mono text-[13px] text-secondary leading-snug">
              {s.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Slide7Visual;
