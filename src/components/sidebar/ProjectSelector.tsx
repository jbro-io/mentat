import { useProjectStore } from "../../stores/useProjectStore";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui";

export function ProjectSelector() {
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const selectProject = useProjectStore((s) => s.selectProject);
  const clearProject = useProjectStore((s) => s.clearProject);

  if (projects.length === 0) {
    return null;
  }

  const handleChange = (value: string) => {
    if (value === "__none__") {
      clearProject();
    } else {
      selectProject(value);
    }
  };

  // Find the path of the active project to set the select value
  const activeProjectPath = activeProject
    ? projects.find((p) => p.name === activeProject.name)?.path ?? "__none__"
    : "__none__";

  return (
    <div className="p-3 border-b border-mentat-border">
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
        Project
      </h2>
      <Select value={activeProjectPath} onValueChange={handleChange}>
        <SelectTrigger className="w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No project</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.path} value={project.path}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
