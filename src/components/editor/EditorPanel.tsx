import { usePromptStore } from "../../stores/usePromptStore";
import { useUIStore } from "../../stores/useUIStore";
import { PromptEditor } from "./PromptEditor";
import { MetadataForm } from "./MetadataForm";
import { EditorToolbar } from "./EditorToolbar";

export function EditorPanel() {
  const selectedPrompt = usePromptStore((s) => s.selectedPrompt);
  const editorMode = useUIStore((s) => s.editorMode);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);

  if (!selectedPrompt) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-600">
          <p className="text-lg mb-1">No prompt selected</p>
          <p className="text-sm mb-4">
            Select a prompt from the list or press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-mono">
              Cmd+K
            </kbd>{" "}
            to search
          </p>
          <button
            onClick={() => setNewPromptDialogOpen(true)}
            className="text-sm px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Create New Prompt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <EditorToolbar prompt={selectedPrompt} />
      <MetadataForm prompt={selectedPrompt} />
      <div className="flex-1 overflow-hidden">
        {editorMode === "edit" ? (
          <PromptEditor prompt={selectedPrompt} />
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
