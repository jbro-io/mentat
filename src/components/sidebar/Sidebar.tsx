import { FolderTree } from "./FolderTree";
import { ProjectSelector } from "./ProjectSelector";
import { SyncStatus } from "./SyncStatus";
import { TagList } from "./TagList";
import { useComposeStore } from "../../stores/useComposeStore";
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
  const isComposing = useComposeStore((s) => s.isComposing);
  const toggleComposing = useComposeStore((s) => s.toggleComposing);

  return (
    <div className="h-full flex flex-col bg-mentat-bg border-r border-mentat-border overflow-y-auto">
      <div className="p-3 border-b border-mentat-border flex items-center justify-between">
        <h1 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
          Mentat
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleComposing}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              isComposing
                ? "bg-mentat-accent text-black font-medium"
                : "bg-mentat-bg-raised text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-surface"
            }`}
            title="Toggle Compose Mode"
          >
            Compose
          </button>
          <button
            onClick={() => setNewPromptDialogOpen(true)}
            className="text-xs px-2 py-0.5 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover transition-colors"
            title="New Prompt (Cmd+N)"
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ProjectSelector />

        {/* Type Filter */}
        <div className="p-3 border-b border-mentat-border">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Type
          </h2>
          <button
            onClick={() => setTypeFilter(undefined)}
            className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
              !activeType
                ? "bg-mentat-bg-raised text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised/50"
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
                  ? "bg-mentat-bg-raised text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised/50"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Target Filter */}
        <div className="p-3 border-b border-mentat-border">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Target
          </h2>
          <button
            onClick={() => setTargetFilter(undefined)}
            className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
              !activeTarget
                ? "bg-mentat-bg-raised text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised/50"
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
                  ? "bg-mentat-bg-raised text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <FolderTree />
        <TagList />
      </div>

      <SyncStatus />
    </div>
  );
}
