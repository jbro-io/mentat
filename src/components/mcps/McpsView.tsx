import { useEffect, useState, useMemo } from "react";
import { useClaudeConfigStore } from "../../stores/useClaudeConfigStore";
import { useUIStore } from "../../stores/useUIStore";
import { useToastStore } from "../../stores/useToastStore";
import type { McpWithProjects } from "../../types/claude-config";
import { Input } from "../ui";
import { McpOverviewCard } from "./McpOverviewCard";
import { InstallMcpDialog } from "./InstallMcpDialog";
import * as api from "../../lib/tauri";

export function McpsView() {
  const allMcpServers = useClaudeConfigStore((s) => s.allMcpServers);
  const mcpLoading = useClaudeConfigStore((s) => s.mcpLoading);
  const projects = useClaudeConfigStore((s) => s.projects);
  const fetchAllMcps = useClaudeConfigStore((s) => s.fetchAllMcps);
  const selectProject = useClaudeConfigStore((s) => s.selectProject);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showToast = useToastStore((s) => s.showToast);

  const [search, setSearch] = useState("");
  const [dialogMcp, setDialogMcp] = useState<McpWithProjects | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAllMcps();
  }, [fetchAllMcps]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allMcpServers;
    const q = search.toLowerCase();
    return allMcpServers.filter(
      (m) =>
        m.server.name.toLowerCase().includes(q) ||
        m.server.command?.toLowerCase().includes(q) ||
        m.server.url?.toLowerCase().includes(q) ||
        m.projects.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [allMcpServers, search]);

  const getAvailableProjects = (mcp: McpWithProjects) => {
    const usedPaths = new Set(mcp.projects.map((p) => p.path));
    return projects.filter((p) => !usedPaths.has(p.path));
  };

  const handleInstallClick = (mcp: McpWithProjects) => {
    setDialogMcp(mcp);
    setDialogOpen(true);
  };

  const handleMakeGlobal = async (mcp: McpWithProjects) => {
    try {
      await api.installMcpGlobally(
        mcp.server.name,
        mcp.server.command ?? undefined,
        mcp.server.args ?? undefined,
        mcp.server.server_type ?? undefined,
        mcp.server.url ?? undefined,
        mcp.server.env,
      );
      showToast(`${mcp.server.name} is now a global MCP`);
      fetchAllMcps();
    } catch (e) {
      showToast("Failed to make global: " + String(e));
    }
  };

  const handleProjectClick = (projectPath: string) => {
    selectProject(projectPath);
    setActiveTab("projects");
  };

  return (
    <div className="h-full flex flex-col bg-mentat-bg">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-mentat-border">
        <Input
          type="text"
          placeholder="Search MCP servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mcpLoading ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
            Loading MCP servers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-zinc-600 text-sm mb-1">
                {search.trim()
                  ? "No MCP servers match your search"
                  : "No MCP servers found"}
              </div>
              <div className="text-zinc-700 text-xs">
                {search.trim()
                  ? "Try a different search term"
                  : "Configure MCP servers in your project or global Claude settings"}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="text-xs text-zinc-500 mb-2">
              {filtered.length} MCP server{filtered.length !== 1 ? "s" : ""}{" "}
              across {projects.length} project
              {projects.length !== 1 ? "s" : ""}
            </div>
            {filtered.map((mcp) => (
              <McpOverviewCard
                key={mcp.server.name}
                mcp={mcp}
                availableProjects={getAvailableProjects(mcp)}
                onInstallClick={handleInstallClick}
                onMakeGlobal={handleMakeGlobal}
                onProjectClick={handleProjectClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Install dialog */}
      <InstallMcpDialog
        mcp={dialogMcp}
        availableProjects={dialogMcp ? getAvailableProjects(dialogMcp) : []}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
