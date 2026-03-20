import type { PromptSummary } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";

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

  return (
    <button
      data-prompt-item
      onClick={() => selectPrompt(prompt.file_path)}
      className={`w-full text-left px-3 py-2 border-b border-zinc-800/50 transition-colors ${
        isSelected
          ? "bg-zinc-800"
          : isFocused
            ? "bg-zinc-800/70"
            : "hover:bg-zinc-800/50"
      } ${isFocused ? "ring-1 ring-inset ring-indigo-500/40" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-zinc-200 truncate">
          {prompt.title}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[prompt.prompt_type] || "bg-zinc-800 text-zinc-400"}`}
        >
          {prompt.prompt_type}
        </span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {prompt.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500"
          >
            {tag}
          </span>
        ))}
        {prompt.target.map((t) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400"
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
