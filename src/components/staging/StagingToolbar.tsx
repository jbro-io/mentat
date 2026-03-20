import { useStagingStore } from "../../stores/useStagingStore";
import { useToastStore } from "../../stores/useToastStore";

export function StagingToolbar() {
  const stagedPrompt = useStagingStore((s) => s.stagedPrompt);
  const dispatch = useStagingStore((s) => s.dispatch);
  const clearStaging = useStagingStore((s) => s.clearStaging);
  const showToast = useToastStore((s) => s.showToast);

  const handleCopyResolved = async () => {
    try {
      await dispatch("clipboard");
      showToast("Resolved prompt copied to clipboard!");
    } catch {
      showToast("Failed to copy resolved prompt");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-mentat-border bg-mentat-bg-raised">
      <h2 className="text-sm font-medium text-mentat-accent truncate">
        Staging: {stagedPrompt?.meta.title ?? ""}
      </h2>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyResolved}
          className="text-xs px-2 py-1 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover transition-colors"
          title="Copy resolved prompt (Cmd+D)"
        >
          Copy Resolved
        </button>
        <button
          onClick={clearStaging}
          className="text-xs px-2 py-1 rounded bg-mentat-bg-raised text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-surface transition-colors"
        >
          Back to Editor
        </button>
      </div>
    </div>
  );
}
