import type { Prompt } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import { useUIStore } from "../../stores/useUIStore";
import { useToastStore } from "../../stores/useToastStore";
import { useStagingStore } from "../../stores/useStagingStore";
import * as api from "../../lib/tauri";
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
    await deletePrompt(prompt.file_path);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-mentat-border bg-mentat-bg">
      <h2 className="text-sm font-medium text-zinc-200 truncate">
        {prompt.meta.title}
      </h2>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setEditorPreference(
              editorPreference === "codemirror" ? "neovim" : "codemirror",
            )
          }
          className="text-zinc-500 hover:text-zinc-200 font-mono"
          title={`Switch to ${editorPreference === "codemirror" ? "Neovim" : "CodeMirror"}`}
        >
          {editorPreference === "codemirror" ? "CM" : "NV"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setEditorMode(editorMode === "edit" ? "preview" : "edit")
          }
        >
          {editorMode === "edit" ? "Preview" : "Edit"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCopy}
          title="Copy to clipboard (Cmd+Shift+C)"
        >
          Copy
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => stagePrompt(prompt)}
          className="bg-mentat-accent-muted text-mentat-accent hover:bg-mentat-bg-surface hover:text-mentat-accent"
          title="Stage prompt (Cmd+D)"
        >
          Stage
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="danger" size="sm">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <div className="p-4 space-y-3">
              <AlertDialogTitle>Delete &ldquo;{prompt.meta.title}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The prompt file will be permanently deleted.
              </AlertDialogDescription>
              <div className="flex justify-end gap-2 pt-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
