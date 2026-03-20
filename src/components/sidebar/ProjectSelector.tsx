import { useProjectStore } from "../../stores/useProjectStore";

export function ProjectSelector() {
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const selectProject = useProjectStore((s) => s.selectProject);
  const clearProject = useProjectStore((s) => s.clearProject);

  if (projects.length === 0) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      clearProject();
    } else {
      selectProject(value);
    }
  };

  // Find the path of the active project to set the select value
  const activeProjectPath = activeProject
    ? projects.find((p) => p.name === activeProject.name)?.path ?? ""
    : "";

  return (
    <div className="p-3 border-b border-mentat-border">
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
        Project
      </h2>
      <select
        value={activeProjectPath}
        onChange={handleChange}
        className="w-full text-sm bg-mentat-bg-raised text-zinc-300 rounded px-2 py-1.5 border border-mentat-border focus:border-mentat-accent focus:outline-none transition-colors"
      >
        <option value="">No project</option>
        {projects.map((project) => (
          <option key={project.path} value={project.path}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
