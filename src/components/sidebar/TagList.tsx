import { usePromptStore } from "../../stores/usePromptStore";
import { useFilterStore } from "../../stores/useFilterStore";

export function TagList() {
  const tags = usePromptStore((s) => s.tags);
  const setTagFilter = useFilterStore((s) => s.setTagFilter);
  const activeTags = useFilterStore((s) => s.activeFilters.tags);

  const toggleTag = (tag: string) => {
    const current = activeTags || [];
    if (current.includes(tag)) {
      setTagFilter(current.filter((t) => t !== tag));
    } else {
      setTagFilter([...current, tag]);
    }
  };

  return (
    <div className="p-3 border-t border-mentat-border">
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Tags</h2>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              activeTags?.includes(tag)
                ? "bg-mentat-accent text-black font-medium"
                : "bg-mentat-bg-raised text-zinc-400 hover:bg-mentat-bg-surface"
            }`}
          >
            {tag}
          </button>
        ))}
        {tags.length === 0 && (
          <p className="text-xs text-zinc-600">No tags yet</p>
        )}
      </div>
    </div>
  );
}
