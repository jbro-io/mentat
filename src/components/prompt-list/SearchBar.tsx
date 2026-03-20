import { useFilterStore } from "../../stores/useFilterStore";
import { Input } from "../ui";

export function SearchBar() {
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);

  return (
    <Input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search prompts..."
    />
  );
}
