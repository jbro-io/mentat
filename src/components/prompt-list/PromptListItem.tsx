import type { PromptSummary } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import { useComposeStore } from "../../stores/useComposeStore";

interface Props {
  prompt: PromptSummary;
  isSelected: boolean;
  isFocused?: boolean;
}

const typeColors: Record<string, string> = {
  "system-prompt": "bg-blue-900/50 text-blue-300",
  skill: "bg-emerald-900/50 text-emerald-300",
  template: "bg-amber-900/50 text-amber-300",
  snippet: "bg-purple-900/50 text-purple-300",
};

export function PromptListItem({ prompt, isSelected, isFocused }: Props) {
  const selectPrompt = usePromptStore((s) => s.selectPrompt);
  const isComposing = useComposeStore((s) => s.isComposing);
  const selectedPaths = useComposeStore((s) => s.selectedPaths);
  const toggleSelection = useComposeStore((s) => s.toggleSelection);

  const composeIndex = selectedPaths.indexOf(prompt.file_path);
  const isComposeSelected = composeIndex >= 0;

  const handleClick = () => {
    if (isComposing) {
      toggleSelection(prompt.file_path);
    } else {
      selectPrompt(prompt.file_path);
    }
  };

  return (
    <button
      data-prompt-item
      onClick={handleClick}
      className={`w-full text-left px-3 py-2 border-b border-mentat-border/50 transition-colors ${
        isComposing && isComposeSelected
          ? "bg-mentat-accent-muted ring-1 ring-inset ring-mentat-accent/40"
          : isSelected && !isComposing
            ? "bg-mentat-bg-raised"
            : isFocused
              ? "bg-mentat-bg-raised/70"
              : "hover:bg-mentat-bg-raised/50"
      } ${isFocused && !isComposing ? "ring-1 ring-inset ring-mentat-accent/40" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isComposing && (
            <span
              className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center text-[10px] font-mono ${
                isComposeSelected
                  ? "bg-mentat-accent border-mentat-accent text-white"
                  : "border-zinc-600 text-zinc-600"
              }`}
            >
              {isComposeSelected ? composeIndex + 1 : ""}
            </span>
          )}
          <span className="text-sm font-medium text-zinc-200 truncate">
            {prompt.title}
          </span>
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[prompt.prompt_type] || "bg-mentat-bg-raised text-zinc-400"}`}
        >
          {prompt.prompt_type}
        </span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {prompt.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-mentat-bg-raised text-zinc-500"
          >
            {tag}
          </span>
        ))}
        {prompt.target.map((t) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-mentat-bg-surface text-zinc-400"
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
