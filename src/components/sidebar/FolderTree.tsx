import { usePromptStore } from "../../stores/usePromptStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { Button } from "../ui";

export function FolderTree() {
  const folders = usePromptStore((s) => s.folders);
  const prompts = usePromptStore((s) => s.prompts);
  const setFolderFilter = useFilterStore((s) => s.setFolderFilter);
  const activeFolder = useFilterStore((s) => s.activeFilters.folder);

  // Count prompts per folder based on file_path prefix
  const folderCounts: Record<string, number> = {};
  for (const p of prompts) {
    for (const f of folders) {
      if (p.file_path.startsWith(f + "/") || p.file_path.startsWith(f + "\\")) {
        folderCounts[f] = (folderCounts[f] || 0) + 1;
      }
    }
  }

  return (
    <div className="p-3">
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
        Folders
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setFolderFilter(undefined)}
        className={`w-full justify-between text-sm px-2 py-1 flex items-center ${
          !activeFolder
            ? "bg-mentat-bg-raised text-zinc-100"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised/50"
        }`}
      >
        <span>All Prompts</span>
        <span className="text-[10px] text-zinc-500">{prompts.length}</span>
      </Button>
      {folders.map((folder) => (
        <Button
          key={folder}
          variant="ghost"
          size="sm"
          onClick={() => setFolderFilter(folder)}
          className={`w-full justify-between text-sm px-2 py-1 flex items-center ${
            activeFolder === folder
              ? "bg-mentat-bg-raised text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised/50"
          }`}
        >
          <span>{folder}</span>
          <span className="text-[10px] text-zinc-500">
            {folderCounts[folder] || 0}
          </span>
        </Button>
      ))}
    </div>
  );
}
