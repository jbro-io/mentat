import { useEffect, useState, useCallback, useRef, type KeyboardEvent } from "react";
import type { ClaudeProject } from "../../types/claude-config";

interface ProjectListProps {
  projects: ClaudeProject[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function ProjectList({ projects, selectedPath, onSelect }: ProjectListProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset focused index when projects change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [projects.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (projects.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < projects.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if ((e.key === "Enter" || e.key === "l") && focusedIndex >= 0) {
        e.preventDefault();
        const p = projects[focusedIndex];
        if (p) {
          onSelect(p.path);
        }
      } else if (e.key === "g") {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "G") {
        e.preventDefault();
        setFocusedIndex(projects.length - 1);
      }
    },
    [projects, focusedIndex, onSelect]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-project-item]");
    const item = items[focusedIndex];
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-mentat-bg"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="p-3 border-b border-mentat-border flex items-center justify-between">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Claude Projects
        </h2>
        <span className="text-[10px] text-zinc-600">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {projects.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm">
            No Claude projects found
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.path}
              data-project-item
              onClick={() => onSelect(project.path)}
              className={[
                "px-3 py-2.5 border-b border-mentat-border cursor-pointer transition-colors",
                selectedPath === project.path
                  ? "bg-mentat-bg-surface border-l-2 border-l-mentat-accent"
                  : focusedIndex === index
                    ? "bg-mentat-bg-raised"
                    : "hover:bg-mentat-bg-raised/50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {project.name}
                </span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
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
              </div>
              <div className="text-[10px] text-zinc-600 font-mono truncate">
                {project.path}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
