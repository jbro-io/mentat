import { useState } from "react";
import type { ClaudeProjectConfig, GlobalConfig } from "../../types/claude-config";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui";
import { McpServerCard } from "./McpServerCard";
import { HooksList } from "./HooksList";

interface ProjectDetailProps {
  config: ClaudeProjectConfig;
  globalConfig: GlobalConfig | null;
}

function SectionHeader({
  title,
  count,
  isOpen,
}: {
  title: string;
  count?: number;
  isOpen: boolean;
}) {
  return (
    <div className="flex items-center gap-2 cursor-pointer group">
      <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
        {isOpen ? "\u25BC" : "\u25B6"}
      </span>
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {title}
      </h3>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-zinc-600 bg-mentat-bg-surface px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

export function ProjectDetail({ config, globalConfig }: ProjectDetailProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["mcp", "hooks", "permissions", "plugins", "claude-md", "settings", "global-mcp", "global-hooks"])
  );

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const settingsEntries = Object.entries(config.settings);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-mentat-border">
        <h2 className="text-lg font-semibold text-zinc-200">{config.name}</h2>
        <p className="text-xs text-zinc-500 font-mono mt-0.5">{config.path}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* MCP Servers */}
        <Collapsible
          open={openSections.has("mcp")}
          onOpenChange={() => toggleSection("mcp")}
        >
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader
                title="MCP Servers"
                count={config.mcp_servers.length}
                isOpen={openSections.has("mcp")}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-2">
              {config.mcp_servers.length === 0 ? (
                <div className="text-sm text-zinc-600 text-center py-3">
                  No project MCP servers configured
                </div>
              ) : (
                config.mcp_servers.map((server) => (
                  <McpServerCard key={server.name} server={server} />
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Hooks */}
        <Collapsible
          open={openSections.has("hooks")}
          onOpenChange={() => toggleSection("hooks")}
        >
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader
                title="Hooks"
                count={config.hooks.length}
                isOpen={openSections.has("hooks")}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2">
              <HooksList hooks={config.hooks} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Permissions */}
        <Collapsible
          open={openSections.has("permissions")}
          onOpenChange={() => toggleSection("permissions")}
        >
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader
                title="Permissions"
                count={config.permissions.length}
                isOpen={openSections.has("permissions")}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2">
              {config.permissions.length === 0 ? (
                <div className="text-sm text-zinc-600 text-center py-3">
                  No permissions configured
                </div>
              ) : (
                <div className="space-y-1">
                  {config.permissions.map((perm) => (
                    <div
                      key={perm}
                      className="font-mono text-xs text-zinc-300 bg-mentat-bg rounded px-3 py-1.5 border border-mentat-border"
                    >
                      {perm}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Plugins */}
        <Collapsible
          open={openSections.has("plugins")}
          onOpenChange={() => toggleSection("plugins")}
        >
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader
                title="Plugins"
                count={config.plugins.length}
                isOpen={openSections.has("plugins")}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2">
              {config.plugins.length === 0 ? (
                <div className="text-sm text-zinc-600 text-center py-3">
                  No plugins configured
                </div>
              ) : (
                <div className="space-y-1">
                  {config.plugins.map((plugin) => (
                    <div
                      key={plugin}
                      className="font-mono text-xs text-zinc-300 bg-mentat-bg rounded px-3 py-1.5 border border-mentat-border"
                    >
                      {plugin}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* CLAUDE.md */}
        {config.has_claude_md && (
          <Collapsible
            open={openSections.has("claude-md")}
            onOpenChange={() => toggleSection("claude-md")}
          >
            <CollapsibleTrigger asChild>
              <div>
                <SectionHeader
                  title="CLAUDE.md"
                  isOpen={openSections.has("claude-md")}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2">
                {config.claude_md_preview ? (
                  <div className="bg-mentat-bg rounded border border-mentat-border p-3">
                    <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                      {config.claude_md_preview}
                    </pre>
                  </div>
                ) : (
                  <div className="text-sm text-zinc-600 text-center py-3">
                    CLAUDE.md exists but is empty
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Settings */}
        {settingsEntries.length > 0 && (
          <Collapsible
            open={openSections.has("settings")}
            onOpenChange={() => toggleSection("settings")}
          >
            <CollapsibleTrigger asChild>
              <div>
                <SectionHeader
                  title="Settings"
                  count={settingsEntries.length}
                  isOpen={openSections.has("settings")}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1">
                {settingsEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-mentat-bg rounded px-3 py-2 border border-mentat-border flex items-start gap-2"
                  >
                    <span className="text-xs font-medium text-zinc-400 shrink-0">
                      {key}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono break-all">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value, null, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Global Config Section */}
        {globalConfig && (
          <>
            <div className="border-t border-mentat-border pt-4 mt-4">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Global Configuration
              </h3>
            </div>

            {/* Global MCP Servers */}
            <Collapsible
              open={openSections.has("global-mcp")}
              onOpenChange={() => toggleSection("global-mcp")}
            >
              <CollapsibleTrigger asChild>
                <div>
                  <SectionHeader
                    title="Global MCP Servers"
                    count={globalConfig.mcp_servers.length}
                    isOpen={openSections.has("global-mcp")}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {globalConfig.mcp_servers.length === 0 ? (
                    <div className="text-sm text-zinc-600 text-center py-3">
                      No global MCP servers configured
                    </div>
                  ) : (
                    globalConfig.mcp_servers.map((server) => (
                      <McpServerCard key={server.name} server={server} />
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Global Hooks */}
            <Collapsible
              open={openSections.has("global-hooks")}
              onOpenChange={() => toggleSection("global-hooks")}
            >
              <CollapsibleTrigger asChild>
                <div>
                  <SectionHeader
                    title="Global Hooks"
                    count={globalConfig.hooks.length}
                    isOpen={openSections.has("global-hooks")}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2">
                  <HooksList hooks={globalConfig.hooks} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
}
