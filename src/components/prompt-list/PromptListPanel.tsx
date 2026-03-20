import { useEffect, useState, useCallback, useRef, type KeyboardEvent } from "react";
import { usePromptStore } from "../../stores/usePromptStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { useUIStore } from "../../stores/useUIStore";
import { useStagingStore } from "../../stores/useStagingStore";
import { PromptListItem } from "./PromptListItem";
import { SearchBar } from "./SearchBar";
import * as api from "../../lib/tauri";

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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Focus the prompt list when requested (e.g. after neovim exits with <leader>e)
  useEffect(() => {
    if (promptListFocusRequested > 0 && containerRef.current) {
      containerRef.current.focus();
      // If a prompt is selected, focus on it in the list
      if (selectedPrompt) {
        const idx = displayedPrompts.findIndex((p) => p.id === selectedPrompt.meta.id);
        setFocusedIndex(idx >= 0 ? idx : 0);
      } else if (displayedPrompts.length > 0) {
        setFocusedIndex(0);
      }
    }
  }, [promptListFocusRequested, selectedPrompt, displayedPrompts]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (displayedPrompts.length === 0) return;

      // Don't capture keys when typing in the search bar
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      // j/k and arrow keys for navigation
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < displayedPrompts.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "ArrowRight") {
        // Move focus to the editor/staging panel
        e.preventDefault();
        requestEditorFocus();
      } else if ((e.key === "Enter" || e.key === "l") && focusedIndex >= 0) {
        e.preventDefault();
        const p = displayedPrompts[focusedIndex];
        if (!p) return;
        if (isStaging) {
          // In staging mode: insert the prompt's body into the staging editor
          api.getPrompt(p.file_path).then((prompt) => {
            insertPromptBody(prompt.body);
          });
        } else {
          selectPrompt(p.file_path);
        }
      } else if (e.key === "g" && !e.ctrlKey) {
        // gg to go to top (just g goes to top for simplicity)
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "G") {
        // G to go to bottom
        e.preventDefault();
        setFocusedIndex(displayedPrompts.length - 1);
      } else if (e.key === "/") {
        // / to focus search bar
        e.preventDefault();
        const searchInput = containerRef.current?.querySelector("input");
        searchInput?.focus();
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
      ref={containerRef}
      className="h-full flex flex-col bg-mentat-bg"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="p-3 border-b border-mentat-border flex items-center gap-2">
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
