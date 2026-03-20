import { useComposeStore } from "../../stores/useComposeStore";
import { usePromptStore } from "../../stores/usePromptStore";
import { Button } from "../ui";

export function ComposeBar() {
  const selectedPaths = useComposeStore((s) => s.selectedPaths);
  const isComposing = useComposeStore((s) => s.isComposing);
  const reorder = useComposeStore((s) => s.reorder);
  const toggleSelection = useComposeStore((s) => s.toggleSelection);
  const clearSelection = useComposeStore((s) => s.clearSelection);
  const compose = useComposeStore((s) => s.compose);
  const prompts = usePromptStore((s) => s.prompts);

  if (!isComposing || selectedPaths.length === 0) {
    return null;
  }

  const getTitleForPath = (filePath: string): string => {
    const found = prompts.find((p) => p.file_path === filePath);
    return found?.title ?? filePath;
  };

  const handleCompose = async () => {
    try {
      await compose();
    } catch (e) {
      console.error("Compose failed:", e);
    }
  };

  return (
    <div className="border-t border-mentat-border bg-mentat-bg-raised px-4 py-3 animate-[slideUpIn_200ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-mentat-accent uppercase tracking-wider">
          Compose Queue ({selectedPaths.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={clearSelection}>
            Clear
          </Button>
          <Button variant="primary" size="sm" onClick={handleCompose}>
            Compose & Stage
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {selectedPaths.map((filePath, index) => (
          <div
            key={filePath}
            className="flex items-center gap-1 bg-mentat-bg-raised rounded px-2 py-1 text-xs text-zinc-300"
          >
            <span className="text-mentat-accent font-mono text-[10px] mr-0.5">
              {index + 1}
            </span>
            <span className="truncate max-w-[120px]">
              {getTitleForPath(filePath)}
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reorder(index, index - 1)}
                disabled={index === 0}
                className="p-0 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                title="Move up"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 2L2 6h6L5 2z" fill="currentColor" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reorder(index, index + 1)}
                disabled={index === selectedPaths.length - 1}
                className="p-0 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                title="Move down"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 8L2 4h6L5 8z" fill="currentColor" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSelection(filePath)}
                className="p-0 text-zinc-500 hover:text-red-400 ml-0.5"
                title="Remove"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
