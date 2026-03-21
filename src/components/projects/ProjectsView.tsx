import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useClaudeConfigStore } from "../../stores/useClaudeConfigStore";
import { ProjectList } from "./ProjectList";
import { ProjectDetail } from "./ProjectDetail";

function ResizeHandle() {
  return (
    <PanelResizeHandle className="group relative w-px bg-zinc-700 hover:bg-mentat-accent-hover transition-colors duration-150">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-zinc-600 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-active:bg-mentat-accent transition-opacity" />
    </PanelResizeHandle>
  );
}

export function ProjectsView() {
  const projects = useClaudeConfigStore((s) => s.projects);
  const selectedProject = useClaudeConfigStore((s) => s.selectedProject);
  const globalConfig = useClaudeConfigStore((s) => s.globalConfig);
  const loading = useClaudeConfigStore((s) => s.loading);
  const fetchProjects = useClaudeConfigStore((s) => s.fetchProjects);
  const selectProject = useClaudeConfigStore((s) => s.selectProject);
  const fetchGlobalConfig = useClaudeConfigStore((s) => s.fetchGlobalConfig);

  useEffect(() => {
    fetchProjects();
    fetchGlobalConfig();
  }, [fetchProjects, fetchGlobalConfig]);

  return (
    <div className="h-full flex flex-col bg-mentat-bg">
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={30} minSize={20} maxSize={40}>
          <ProjectList
            projects={projects}
            selectedPath={selectedProject?.path ?? null}
            onSelect={selectProject}
          />
        </Panel>
        <ResizeHandle />
        <Panel defaultSize={70} minSize={40}>
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
        </Panel>
      </PanelGroup>
    </div>
  );
}
