import { usePromptStore } from "../../stores/usePromptStore";
import { useUIStore } from "../../stores/useUIStore";
import { useStagingStore } from "../../stores/useStagingStore";
import { PromptEditor } from "./PromptEditor";
import { NeovimEditor } from "./NeovimEditor";
import { MetadataForm } from "./MetadataForm";
import { EditorToolbar } from "./EditorToolbar";
import { StagingPanel } from "../staging/StagingPanel";

export function EditorPanel() {
  const selectedPrompt = usePromptStore((s) => s.selectedPrompt);
  const editorMode = useUIStore((s) => s.editorMode);
  const editorPreference = useUIStore((s) => s.editorPreference);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);
  const isStaging = useStagingStore((s) => s.isStaging);

  if (isStaging) {
    return <StagingPanel />;
  }

  if (!selectedPrompt) {
    return (
      <div className="h-full flex items-center justify-center bg-mentat-bg">
        <div className="text-center text-zinc-600">
          <p className="text-lg mb-1">No prompt selected</p>
          <p className="text-sm mb-4">
            Select a prompt from the list or press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-mentat-bg-raised border border-mentat-border text-zinc-400 text-xs font-mono">
              Cmd+K
            </kbd>{" "}
            to search
          </p>
          <button
            onClick={() => setNewPromptDialogOpen(true)}
            className="text-sm px-3 py-1.5 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover transition-colors"
          >
            Create New Prompt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-mentat-bg">
      <EditorToolbar prompt={selectedPrompt} />
      <MetadataForm prompt={selectedPrompt} />
      <div className="flex-1 overflow-hidden">
        {editorMode === "edit" ? (
          editorPreference === "neovim" ? (
            <NeovimEditor prompt={selectedPrompt} />
          ) : (
            <PromptEditor prompt={selectedPrompt} />
          )
        ) : (
          <div className="h-full overflow-y-auto p-4 prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-zinc-300">
              {selectedPrompt.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
