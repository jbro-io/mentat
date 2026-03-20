import { FolderTree } from "./FolderTree";
import { TagList } from "./TagList";
import { useFilterStore } from "../../stores/useFilterStore";
import { useUIStore } from "../../stores/useUIStore";
import type { PromptType } from "../../types/prompt";

const PROMPT_TYPES: { value: PromptType; label: string }[] = [
  { value: "system-prompt", label: "System Prompt" },
  { value: "skill", label: "Skill" },
  { value: "template", label: "Template" },
  { value: "snippet", label: "Snippet" },
];

const TARGET_OPTIONS = ["claude", "openai"];

export function Sidebar() {
  const activeType = useFilterStore((s) => s.activeFilters.prompt_type);
  const activeTarget = useFilterStore((s) => s.activeFilters.target);
  const setTypeFilter = useFilterStore((s) => s.setTypeFilter);
  const setTargetFilter = useFilterStore((s) => s.setTargetFilter);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
          Mentat
        </h1>
        <button
          onClick={() => setNewPromptDialogOpen(true)}
          className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          title="New Prompt (Cmd+N)"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Type Filter */}
        <div className="p-3 border-b border-zinc-800">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Type
          </h2>
          <button
            onClick={() => setTypeFilter(undefined)}
            className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
              !activeType
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            All Types
          </button>
          {PROMPT_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() =>
                setTypeFilter(activeType === pt.value ? undefined : pt.value)
              }
              className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
                activeType === pt.value
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Target Filter */}
        <div className="p-3 border-b border-zinc-800">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Target
          </h2>
          <button
            onClick={() => setTargetFilter(undefined)}
            className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
              !activeTarget
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            All Targets
          </button>
          {TARGET_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() =>
                setTargetFilter(activeTarget === t ? undefined : t)
              }
              className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
                activeTarget === t
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <FolderTree />
        <TagList />
      </div>
    </div>
  );
}
