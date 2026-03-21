import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from "react";
import type { ScratchFile } from "../../lib/tauri";
import { useScratchStore } from "../../stores/useScratchStore";
import { NewScratchDialog } from "./NewScratchDialog";
import {
  Button,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui";

const LANGUAGE_BADGE: Record<string, { bg: string; text: string }> = {
  text: { bg: "bg-zinc-700", text: "text-zinc-300" },
  typescript: { bg: "bg-blue-900/50", text: "text-blue-300" },
  rust: { bg: "bg-orange-900/50", text: "text-orange-300" },
  python: { bg: "bg-yellow-900/50", text: "text-yellow-300" },
  sql: { bg: "bg-purple-900/50", text: "text-purple-300" },
};

export function ScratchList() {
  const scratches = useScratchStore((s) => s.scratches);
  const selectedScratch = useScratchStore((s) => s.selectedScratch);
  const selectScratch = useScratchStore((s) => s.selectScratch);
  const deleteScratch = useScratchStore((s) => s.deleteScratch);
  const scratchListFocusRequested = useScratchStore((s) => s.scratchListFocusRequested);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset focused index when list changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [scratches.length]);

  // Handle focus request from editor (<leader>e)
  useEffect(() => {
    if (scratchListFocusRequested > 0 && containerRef.current) {
      containerRef.current.focus();
      if (selectedScratch) {
        const idx = scratches.findIndex((s) => s.path === selectedScratch.path);
        setFocusedIndex(idx >= 0 ? idx : 0);
      } else if (scratches.length > 0) {
        setFocusedIndex(0);
      }
    }
  }, [scratchListFocusRequested, selectedScratch, scratches]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (scratches.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < scratches.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if ((e.key === "Enter" || e.key === "l") && focusedIndex >= 0) {
        e.preventDefault();
        const s = scratches[focusedIndex];
        if (s) selectScratch(s);
      } else if (e.key === "g" && !e.ctrlKey) {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "G") {
        e.preventDefault();
        setFocusedIndex(scratches.length - 1);
      }
    },
    [scratches, focusedIndex, selectScratch]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-scratch-item]");
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
      <div className="p-3 border-b border-mentat-border flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          {scratches.length} scratch{scratches.length !== 1 ? "es" : ""}
        </span>
        <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
          + New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {scratches.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm">
            No scratches yet
          </div>
        ) : (
          scratches.map((scratch, index) => (
            <ScratchListItem
              key={scratch.path}
              scratch={scratch}
              isSelected={selectedScratch?.path === scratch.path}
              isFocused={focusedIndex === index}
              onSelect={() => selectScratch(scratch)}
              onDelete={() => deleteScratch(scratch.path)}
            />
          ))
        )}
      </div>

      <NewScratchDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function ScratchListItem({
  scratch,
  isSelected,
  isFocused,
  onSelect,
  onDelete,
}: {
  scratch: ScratchFile;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const badge = LANGUAGE_BADGE[scratch.language] ?? LANGUAGE_BADGE.text;

  return (
    <div
      data-scratch-item
      onClick={onSelect}
      className={[
        "group px-3 py-2 cursor-pointer border-b border-mentat-border/50 flex items-center justify-between",
        isSelected
          ? "bg-mentat-bg-raised text-zinc-100"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised/50",
        isFocused ? "ring-1 ring-inset ring-mentat-accent" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm truncate">{scratch.name}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text} shrink-0`}
        >
          {scratch.language}
        </span>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-xs px-1"
            title="Delete scratch"
          >
            x
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <div className="p-4 space-y-3">
            <AlertDialogTitle>Delete Scratch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scratch.name}"? This cannot be undone.
            </AlertDialogDescription>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
