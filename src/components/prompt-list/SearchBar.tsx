import { useFilterStore } from "../../stores/useFilterStore";

export function SearchBar() {
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);

  return (
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search prompts..."
      className="w-full bg-mentat-bg-raised border border-mentat-border rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent"
    />
  );
}
