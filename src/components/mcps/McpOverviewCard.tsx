import { useState } from "react";
import type { McpWithProjects } from "../../types/claude-config";
import {
  Button,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui";

interface McpOverviewCardProps {
  mcp: McpWithProjects;
  availableProjects: { name: string; path: string }[];
  onInstallClick: (mcp: McpWithProjects) => void;
  onMakeGlobal: (mcp: McpWithProjects) => void;
  onProjectClick?: (projectPath: string) => void;
}

export function McpOverviewCard({
  mcp,
  availableProjects,
  onInstallClick,
  onMakeGlobal,
  onProjectClick,
}: McpOverviewCardProps) {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const { server, projects, isGlobal } = mcp;
  const envEntries = Object.entries(server.env);

  return (
    <div className="bg-mentat-bg-raised border border-mentat-border rounded-lg overflow-hidden">
      <div className="p-4">
        {/* Header: Name + Type badge */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium text-zinc-200">
            {server.name}
          </h3>
          <div className="flex items-center gap-2">
            {server.server_type && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-mentat-accent-muted text-mentat-accent uppercase tracking-wide">
                {server.server_type}
              </span>
            )}
          </div>
        </div>

        {/* Command / URL */}
        {server.command && (
          <div className="mb-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Command
            </span>
            <div className="font-mono text-xs text-zinc-300 mt-0.5 bg-mentat-bg rounded px-2 py-1.5 break-all">
              {server.command}
              {server.args && server.args.length > 0 && (
                <span className="text-zinc-500"> {server.args.join(" ")}</span>
              )}
            </div>
          </div>
        )}

        {server.url && (
          <div className="mb-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              URL
            </span>
            <div className="font-mono text-xs text-zinc-300 mt-0.5 bg-mentat-bg rounded px-2 py-1.5 break-all">
              {server.url}
            </div>
          </div>
        )}

        {/* Env vars */}
        {envEntries.length > 0 && (
          <div className="mb-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Environment
            </span>
            <div className="mt-1 space-y-1">
              {envEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 font-mono text-xs"
                >
                  <span className="text-zinc-400">{key}=</span>
                  <span className="text-zinc-500 flex-1 truncate">
                    {revealedKeys.has(key)
                      ? value
                      : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                  </span>
                  <button
                    onClick={() => toggleReveal(key)}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors px-1"
                  >
                    {revealedKeys.has(key) ? "hide" : "show"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects / Global badges */}
        <div className="mb-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Used by
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {isGlobal && (
              <span className="bg-mentat-accent-muted text-mentat-accent text-xs px-2 py-0.5 rounded-full">
                Global
              </span>
            )}
            {projects.map((proj) => (
              <button
                key={proj.path}
                onClick={() => onProjectClick?.(proj.path)}
                className="bg-mentat-bg-surface text-zinc-400 text-xs px-2 py-0.5 rounded-full hover:text-zinc-200 transition-colors"
              >
                {proj.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        {(!isGlobal && availableProjects.length > 0) || !isGlobal ? (
          <div className="flex items-center gap-2 pt-2 border-t border-mentat-border">
            {!isGlobal && availableProjects.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onInstallClick(mcp)}
              >
                Install to...
              </Button>
            )}
            {!isGlobal && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="primary" size="sm">
                    Make Global
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <div className="p-4 space-y-3">
                    <AlertDialogTitle>
                      Make "{server.name}" a global MCP?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will add {server.name} to your global Claude configuration
                      (~/.claude.json). It will be available in all projects.
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2 pt-2">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onMakeGlobal(mcp)}>
                        Make Global
                      </AlertDialogAction>
                    </div>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
