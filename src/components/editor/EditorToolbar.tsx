import type { Prompt } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import { useUIStore } from "../../stores/useUIStore";
import { useToastStore } from "../../stores/useToastStore";
import { useStagingStore } from "../../stores/useStagingStore";
import * as api from "../../lib/tauri";

interface Props {
  prompt: Prompt;
}

export function EditorToolbar({ prompt }: Props) {
  const deletePrompt = usePromptStore((s) => s.deletePrompt);
  const editorMode = useUIStore((s) => s.editorMode);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const editorPreference = useUIStore((s) => s.editorPreference);
  const setEditorPreference = useUIStore((s) => s.setEditorPreference);
  const showToast = useToastStore((s) => s.showToast);
  const stagePrompt = useStagingStore((s) => s.stagePrompt);

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
    <div className="flex items-center justify-between px-4 py-2 border-b border-mentat-border bg-mentat-bg">
      <h2 className="text-sm font-medium text-zinc-200 truncate">
        {prompt.meta.title}
      </h2>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            setEditorPreference(
              editorPreference === "codemirror" ? "neovim" : "codemirror",
            )
          }
          className="text-xs px-2 py-1 rounded bg-mentat-bg-raised text-zinc-500 hover:text-zinc-200 hover:bg-mentat-bg-surface transition-colors font-mono"
          title={`Switch to ${editorPreference === "codemirror" ? "Neovim" : "CodeMirror"}`}
        >
          {editorPreference === "codemirror" ? "CM" : "NV"}
        </button>
        <button
          onClick={() =>
            setEditorMode(editorMode === "edit" ? "preview" : "edit")
          }
          className="text-xs px-2 py-1 rounded bg-mentat-bg-raised text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-surface transition-colors"
        >
          {editorMode === "edit" ? "Preview" : "Edit"}
        </button>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover transition-colors"
          title="Copy to clipboard (Cmd+Shift+C)"
        >
          Copy
        </button>
        <button
          onClick={() => stagePrompt(prompt)}
          className="text-xs px-2 py-1 rounded bg-mentat-accent-muted text-mentat-accent hover:bg-mentat-bg-surface hover:text-mentat-accent transition-colors"
          title="Stage prompt (Cmd+D)"
        >
          Stage
        </button>
        <button
          onClick={handleDelete}
          className="text-xs px-2 py-1 rounded bg-mentat-bg-raised text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
