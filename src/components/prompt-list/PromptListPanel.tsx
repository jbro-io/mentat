import { useEffect, useMemo, type KeyboardEvent } from "react";
import { usePromptStore } from "../../stores/usePromptStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { useUIStore } from "../../stores/useUIStore";
import { useStagingStore } from "../../stores/useStagingStore";
import { useComposeStore } from "../../stores/useComposeStore";
import { SearchBar } from "./SearchBar";
import { ListPanel, type ListItem } from "../ui";
import * as api from "../../lib/tauri";

const typeColors: Record<string, string> = {
  "system-prompt": "bg-blue-900/50 text-blue-300",
  skill: "bg-emerald-900/50 text-emerald-300",
  template: "bg-amber-900/50 text-amber-300",
  snippet: "bg-purple-900/50 text-purple-300",
};

export function PromptListPanel() {
  const prompts = usePromptStore((s) => s.prompts);
  const fetchPrompts = usePromptStore((s) => s.fetchPrompts);
  const selectedPrompt = usePromptStore((s) => s.selectedPrompt);
  const selectPrompt = usePromptStore((s) => s.selectPrompt);
  const searchResults = useFilterStore((s) => s.searchResults);
  const activeFilters = useFilterStore((s) => s.activeFilters);
  const promptListFocusRequested = useUIStore((s) => s.promptListFocusRequested);
  const requestEditorFocus = useUIStore((s) => s.requestEditorFocus);
  const isStaging = useStagingStore((s) => s.isStaging);
  const insertPromptBody = useStagingStore((s) => s.insertPromptBody);
  const isComposing = useComposeStore((s) => s.isComposing);
  const selectedPaths = useComposeStore((s) => s.selectedPaths);
  const toggleSelection = useComposeStore((s) => s.toggleSelection);

  useEffect(() => {
    fetchPrompts(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
  }, [activeFilters, fetchPrompts]);

  const displayedPrompts = searchResults
    ? prompts.filter((p) => searchResults.some((r) => r.id === p.id))
    : prompts;

  const items: ListItem[] = useMemo(
    () =>
      displayedPrompts.map((prompt) => {
        const composeIndex = selectedPaths.indexOf(prompt.file_path);
        const isComposeSelected = composeIndex >= 0;

        return {
          id: prompt.file_path,
          title: prompt.title,
          subtitle: prompt.target.length > 0 ? prompt.target.join(", ") : undefined,
          badges: (
            <div className="flex items-center gap-1">
              {isComposing && (
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center text-[10px] font-mono ${
                    isComposeSelected
                      ? "bg-mentat-accent border-mentat-accent text-white"
                      : "border-zinc-600 text-zinc-600"
                  }`}
                >
                  {isComposeSelected ? composeIndex + 1 : ""}
                </span>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[prompt.prompt_type] || "bg-mentat-bg-raised text-zinc-400"}`}
              >
                {prompt.prompt_type}
              </span>
              {prompt.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-mentat-bg-raised text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          ),
        };
      }),
    [displayedPrompts, isComposing, selectedPaths],
  );

  const handleSelect = (id: string) => {
    if (isComposing) {
      toggleSelection(id);
    } else if (isStaging) {
      api.getPrompt(id).then((prompt) => {
        insertPromptBody(prompt.body);
      });
    } else {
      selectPrompt(id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      requestEditorFocus();
    } else if (e.key === "/") {
      e.preventDefault();
      const input = e.currentTarget.querySelector("input");
      input?.focus();
    }
  };

  return (
    <ListPanel
      items={items}
      selectedId={selectedPrompt?.file_path ?? null}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
      focusRequested={promptListFocusRequested}
      emptyMessage="No prompts found"
      badgesPosition="right"
      header={
        <>
          <div className="flex-1">
            <SearchBar />
          </div>
          <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2">
            {displayedPrompts.length} prompt{displayedPrompts.length !== 1 ? "s" : ""}
          </span>
        </>
      }
    />
  );
}
