import { useState } from "react";
import type { ScratchFile } from "../../lib/tauri";
import { useScratchStore } from "../../stores/useScratchStore";
import { NewScratchDialog } from "./NewScratchDialog";
import {
  ListPanel,
  type ListItem,
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

function DeleteAction({ scratch, onDelete }: { scratch: ScratchFile; onDelete: () => void }) {
  return (
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
            Are you sure you want to delete &ldquo;{scratch.name}&rdquo;? This cannot be undone.
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
  );
}

export function ScratchList() {
  const scratches = useScratchStore((s) => s.scratches);
  const selectedScratch = useScratchStore((s) => s.selectedScratch);
  const selectScratch = useScratchStore((s) => s.selectScratch);
  const deleteScratch = useScratchStore((s) => s.deleteScratch);
  const scratchListFocusRequested = useScratchStore((s) => s.scratchListFocusRequested);

  const [dialogOpen, setDialogOpen] = useState(false);

  const items: ListItem[] = scratches.map((scratch) => {
    const badge = LANGUAGE_BADGE[scratch.language] ?? LANGUAGE_BADGE.text;
    return {
      id: scratch.path,
      title: scratch.name,
      badges: (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text} shrink-0`}>
          {scratch.language}
        </span>
      ),
      actions: (
        <DeleteAction
          scratch={scratch}
          onDelete={() => deleteScratch(scratch.path)}
        />
      ),
    };
  });

  const handleSelect = (id: string) => {
    const scratch = scratches.find((s) => s.path === id);
    if (scratch) selectScratch(scratch);
  };

  return (
    <>
      <ListPanel
        items={items}
        selectedId={selectedScratch?.path ?? null}
        onSelect={handleSelect}
        focusRequested={scratchListFocusRequested}
        emptyMessage="No scratches yet"
        badgesPosition="right"
        header={
          <>
            <span className="text-[10px] text-zinc-500">
              {scratches.length} scratch{scratches.length !== 1 ? "es" : ""}
            </span>
            <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
              + New
            </Button>
          </>
        }
      />
      <NewScratchDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
