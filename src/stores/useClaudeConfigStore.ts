import { create } from "zustand";
import type {
  ClaudeProject,
  ClaudeProjectConfig,
  GlobalConfig,
  McpWithProjects,
} from "../types/claude-config";
import * as api from "../lib/tauri";

interface ClaudeConfigStore {
  projects: ClaudeProject[];
  selectedProject: ClaudeProjectConfig | null;
  globalConfig: GlobalConfig | null;
  loading: boolean;
  allMcpServers: McpWithProjects[];
  mcpLoading: boolean;

  fetchProjects: () => Promise<void>;
  selectProject: (path: string) => Promise<void>;
  clearSelectedProject: () => void;
  fetchGlobalConfig: () => Promise<void>;
  fetchAllMcps: () => Promise<void>;
  installMcp: (
    serverName: string,
    sourceProjectPath: string,
    targetProjectPath: string,
  ) => Promise<void>;
}

export const useClaudeConfigStore = create<ClaudeConfigStore>((set, get) => ({
  projects: [],
  selectedProject: null,
  globalConfig: null,
  loading: false,
  allMcpServers: [],
  mcpLoading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const projects = await api.listClaudeProjects();
      set({ projects });
    } catch (e) {
      console.error("Failed to fetch Claude projects:", e);
    } finally {
      set({ loading: false });
    }
  },

  selectProject: async (path: string) => {
    set({ loading: true });
    try {
      const config = await api.getClaudeProjectConfig(path);
      set({ selectedProject: config });
    } catch (e) {
      console.error("Failed to load Claude project config:", e);
    } finally {
      set({ loading: false });
    }
  },

  clearSelectedProject: () => {
    set({ selectedProject: null });
  },

  fetchGlobalConfig: async () => {
    try {
      const config = await api.getGlobalClaudeConfig();
      set({ globalConfig: config });
    } catch (e) {
      console.error("Failed to load global Claude config:", e);
    }
  },

  fetchAllMcps: async () => {
    set({ mcpLoading: true });
    try {
      // Fetch projects list if not already loaded
      let { projects } = get();
      if (projects.length === 0) {
        projects = await api.listClaudeProjects();
        set({ projects });
      }

      // Fetch global config
      const globalConfig = await api.getGlobalClaudeConfig();
      set({ globalConfig });

      // Fetch each project's config to get its MCPs
      const projectConfigs = await Promise.all(
        projects.map(async (p) => {
          try {
            return await api.getClaudeProjectConfig(p.path);
          } catch {
            return null;
          }
        }),
      );

      // Build aggregated MCP map: key = server name
      const mcpMap = new Map<string, McpWithProjects>();

      // Add global MCPs
      for (const server of globalConfig.mcp_servers) {
        mcpMap.set(server.name, {
          server,
          projects: [],
          isGlobal: true,
        });
      }

      // Add project MCPs
      for (const config of projectConfigs) {
        if (!config) continue;
        for (const server of config.mcp_servers) {
          const existing = mcpMap.get(server.name);
          if (existing) {
            existing.projects.push({ name: config.name, path: config.path });
          } else {
            mcpMap.set(server.name, {
              server,
              projects: [{ name: config.name, path: config.path }],
              isGlobal: false,
            });
          }
        }
      }

      const allMcpServers = Array.from(mcpMap.values()).sort((a, b) =>
        a.server.name.localeCompare(b.server.name),
      );

      set({ allMcpServers });
    } catch (e) {
      console.error("Failed to fetch all MCPs:", e);
    } finally {
      set({ mcpLoading: false });
    }
  },

  installMcp: async (
    serverName: string,
    _sourceProjectPath: string,
    targetProjectPath: string,
  ) => {
    const { allMcpServers } = get();
    const mcpEntry = allMcpServers.find((m) => m.server.name === serverName);
    if (!mcpEntry) {
      throw new Error(`MCP server "${serverName}" not found`);
    }
    const { server } = mcpEntry;
    await api.installMcpToProject(
      targetProjectPath,
      server.name,
      server.command ?? undefined,
      server.args ?? undefined,
      server.server_type ?? undefined,
      server.url ?? undefined,
      server.env,
    );
    // Refresh the aggregated list
    await get().fetchAllMcps();
  },
}));
