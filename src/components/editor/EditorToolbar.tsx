import type { Prompt } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import { useUIStore } from "../../stores/useUIStore";
import { useToastStore } from "../../stores/useToastStore";
import * as api from "../../lib/tauri";

interface Props {
  prompt: Prompt;
}

export function EditorToolbar({ prompt }: Props) {
  const deletePrompt = usePromptStore((s) => s.deletePrompt);
  const editorMode = useUIStore((s) => s.editorMode);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const showToast = useToastStore((s) => s.showToast);

  const handleCopy = async () => {
    try {
      await api.copyToClipboard(prompt.body);
      showToast("Copied to clipboard!");
    } catch {
      showToast("Failed to copy");
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${prompt.meta.title}"?`)) {
      await deletePrompt(prompt.file_path);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
      <h2 className="text-sm font-medium text-zinc-200 truncate">
        {prompt.meta.title}
      </h2>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            setEditorMode(editorMode === "edit" ? "preview" : "edit")
          }
          className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          {editorMode === "edit" ? "Preview" : "Edit"}
        </button>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          title="Copy to clipboard (Cmd+Shift+C)"
        >
          Copy
        </button>
        <button
          onClick={handleDelete}
          className="text-xs px-2 py-1 rounded bg-zinc-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
