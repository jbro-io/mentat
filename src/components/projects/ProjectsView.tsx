import { useEffect, useRef } from "react";
import { useClaudeConfigStore } from "../../stores/useClaudeConfigStore";
import { useUIStore } from "../../stores/useUIStore";
import { DragHandle } from "../ui";
import { ProjectList } from "./ProjectList";
import { ProjectDetail } from "./ProjectDetail";

export function ProjectsView() {
  const projects = useClaudeConfigStore((s) => s.projects);
  const selectedProject = useClaudeConfigStore((s) => s.selectedProject);
  const globalConfig = useClaudeConfigStore((s) => s.globalConfig);
  const loading = useClaudeConfigStore((s) => s.loading);
  const fetchProjects = useClaudeConfigStore((s) => s.fetchProjects);
  const selectProject = useClaudeConfigStore((s) => s.selectProject);
  const fetchGlobalConfig = useClaudeConfigStore((s) => s.fetchGlobalConfig);
  const listCollapsed = useUIStore((s) => s.listCollapsed);
  const listWidth = useUIStore((s) => s.projectListWidth);
  const setListWidth = useUIStore((s) => s.setProjectListWidth);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProjects();
    fetchGlobalConfig();
  }, [fetchProjects, fetchGlobalConfig]);

  return (
    <div className="h-full flex bg-mentat-bg">
      <div
        ref={listRef}
        className="h-full overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={listCollapsed ? { width: 0, flex: "0 0 0px" } : { flex: `0 0 ${listWidth}px` }}
      >
        <div className="h-full min-w-[200px]">
          <ProjectList
            projects={projects}
            selectedPath={selectedProject?.path ?? null}
            onSelect={selectProject}
          />
        </div>
      </div>

      {!listCollapsed && <DragHandle containerRef={listRef} onWidthChange={setListWidth} />}

      <div className="flex-1 min-w-0 h-full">
        {loading && !selectedProject ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
            Loading...
          </div>
        ) : selectedProject ? (
          <ProjectDetail
            config={selectedProject}
            globalConfig={globalConfig}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-zinc-600 text-sm mb-1">
                Select a project to view its configuration
              </div>
              <div className="text-zinc-700 text-xs">
                Use j/k to navigate, Enter to select
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
