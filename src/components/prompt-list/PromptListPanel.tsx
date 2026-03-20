import { useEffect, useState, useCallback, useRef, type KeyboardEvent } from "react";
import { usePromptStore } from "../../stores/usePromptStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { PromptListItem } from "./PromptListItem";
import { SearchBar } from "./SearchBar";

export function PromptListPanel() {
  const prompts = usePromptStore((s) => s.prompts);
  const fetchPrompts = usePromptStore((s) => s.fetchPrompts);
  const selectedPrompt = usePromptStore((s) => s.selectedPrompt);
  const selectPrompt = usePromptStore((s) => s.selectPrompt);
  const searchResults = useFilterStore((s) => s.searchResults);
  const activeFilters = useFilterStore((s) => s.activeFilters);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPrompts(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
  }, [activeFilters, fetchPrompts]);

  // When searching, show search results mapped to summaries; otherwise show filtered prompts
  const displayedPrompts = searchResults
    ? prompts.filter((p) => searchResults.some((r) => r.id === p.id))
    : prompts;

  // Reset focused index when list changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [displayedPrompts.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (displayedPrompts.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < displayedPrompts.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        const p = displayedPrompts[focusedIndex];
        if (p) selectPrompt(p.file_path);
      }
    },
    [displayedPrompts, focusedIndex, selectPrompt]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-prompt-item]");
    const item = items[focusedIndex];
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  return (
    <div
      className="h-full flex flex-col bg-zinc-900/50"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="flex-1">
          <SearchBar />
        </div>
        <span className="text-[10px] text-zinc-500 whitespace-nowrap">
          {displayedPrompts.length} prompt{displayedPrompts.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {displayedPrompts.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm">
            No prompts found
          </div>
        ) : (
          displayedPrompts.map((prompt, index) => (
            <PromptListItem
              key={prompt.id}
              prompt={prompt}
              isSelected={selectedPrompt?.meta.id === prompt.id}
              isFocused={focusedIndex === index}
            />
          ))
        )}
      </div>
    </div>
  );
}
