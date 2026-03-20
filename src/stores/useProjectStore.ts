import { create } from "zustand";
import type { ProjectConfig, ProjectSummary } from "../types/project";
import * as api from "../lib/tauri";

interface ProjectStore {
  projects: ProjectSummary[];
  activeProject: ProjectConfig | null;

  fetchProjects: () => Promise<void>;
  selectProject: (name: string) => Promise<void>;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProject: null,

  fetchProjects: async () => {
    try {
      const projects = await api.listProjects();
      set({ projects });
    } catch (e) {
      console.error("Failed to fetch projects:", e);
    }
  },

  selectProject: async (name: string) => {
    try {
      const config = await api.getProject(name);
      set({ activeProject: config });
    } catch (e) {
      console.error("Failed to load project:", e);
    }
  },

  clearProject: () => {
    set({ activeProject: null });
  },
}));
