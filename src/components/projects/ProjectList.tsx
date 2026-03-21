import type { ClaudeProject } from "../../types/claude-config";
import { ListPanel, type ListItem } from "../ui";

interface ProjectListProps {
  projects: ClaudeProject[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function ProjectList({ projects, selectedPath, onSelect }: ProjectListProps) {
  const items: ListItem[] = projects.map((project) => ({
    id: project.path,
    title: project.name,
    subtitle: project.path,
    badges: (
      <div className="flex items-center gap-1 shrink-0">
        {project.has_mcp && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-mentat-accent-muted text-mentat-accent">
            MCP
          </span>
        )}
        {project.has_claude_md && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-900/30 text-blue-400">
            MD
          </span>
        )}
        {project.has_settings && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-purple-900/30 text-purple-400">
            CFG
          </span>
        )}
      </div>
    ),
  }));

  return (
    <ListPanel
      items={items}
      selectedId={selectedPath}
      onSelect={onSelect}
      emptyMessage="No Claude projects found"
      header={
        <>
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Claude Projects
          </span>
          <span className="text-[10px] text-zinc-600">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </>
      }
    />
  );
}
