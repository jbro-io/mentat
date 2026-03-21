import { useState } from "react";
import type { McpWithProjects } from "../../types/claude-config";
import { useClaudeConfigStore } from "../../stores/useClaudeConfigStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Checkbox,
} from "../ui";

interface InstallMcpDialogProps {
  mcp: McpWithProjects | null;
  availableProjects: { name: string; path: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallMcpDialog({
  mcp,
  availableProjects,
  open,
  onOpenChange,
}: InstallMcpDialogProps) {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const installMcp = useClaudeConfigStore((s) => s.installMcp);

  const toggleProject = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleInstall = async () => {
    if (!mcp || selectedPaths.size === 0) return;

    setInstalling(true);
    setResult(null);

    try {
      const sourcePath =
        mcp.projects.length > 0 ? mcp.projects[0].path : "__global__";
      for (const targetPath of selectedPaths) {
        await installMcp(mcp.server.name, sourcePath, targetPath);
      }
      setResult({
        type: "success",
        message: `Installed "${mcp.server.name}" to ${selectedPaths.size} project${selectedPaths.size > 1 ? "s" : ""}.`,
      });
      setSelectedPaths(new Set());
    } catch (e) {
      setResult({
        type: "error",
        message: `Failed to install: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedPaths(new Set());
      setResult(null);
    }
    onOpenChange(nextOpen);
  };

  if (!mcp) return null;

  const { server } = mcp;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install "{server.name}"</DialogTitle>
          <DialogDescription>
            Select projects to install this MCP server to.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3">
          {/* Config preview */}
          <div className="bg-mentat-bg rounded-md p-3 border border-mentat-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-zinc-400 font-medium">
                {server.name}
              </span>
              {server.server_type && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-mentat-accent-muted text-mentat-accent uppercase">
                  {server.server_type}
                </span>
              )}
            </div>
            {server.command && (
              <div className="font-mono text-xs text-zinc-500 break-all">
                {server.command}
                {server.args && server.args.length > 0 && (
                  <span> {server.args.join(" ")}</span>
                )}
              </div>
            )}
            {server.url && (
              <div className="font-mono text-xs text-zinc-500 break-all">
                {server.url}
              </div>
            )}
          </div>

          {/* Project checkboxes */}
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Projects
            </span>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {availableProjects.length === 0 ? (
                <div className="text-xs text-zinc-600 py-2">
                  All projects already have this MCP server.
                </div>
              ) : (
                availableProjects.map((proj) => (
                  <label
                    key={proj.path}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedPaths.has(proj.path)}
                      onCheckedChange={() => toggleProject(proj.path)}
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                      {proj.name}
                    </span>
                    <span className="text-[10px] text-zinc-600 truncate flex-1">
                      {proj.path}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Result feedback */}
          {result && (
            <div
              className={`text-xs px-3 py-2 rounded ${
                result.type === "success"
                  ? "bg-green-900/20 text-green-400 border border-green-800/30"
                  : "bg-red-900/20 text-red-400 border border-red-800/30"
              }`}
            >
              {result.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            {result?.type === "success" ? "Done" : "Cancel"}
          </Button>
          {!result?.type && (
            <Button
              variant="primary"
              disabled={selectedPaths.size === 0 || installing}
              onClick={handleInstall}
            >
              {installing
                ? "Installing..."
                : `Install to ${selectedPaths.size || ""} project${selectedPaths.size !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
