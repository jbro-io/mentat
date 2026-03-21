import { useState } from "react";
import type { McpServer } from "../../types/claude-config";

interface McpServerCardProps {
  server: McpServer;
}

export function McpServerCard({ server }: McpServerCardProps) {
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

  const envEntries = Object.entries(server.env);

  return (
    <div className="bg-mentat-bg-raised border border-mentat-border rounded-lg border-l-2 border-l-mentat-accent overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-zinc-200">{server.name}</h4>
          {server.server_type && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-mentat-accent-muted text-mentat-accent uppercase tracking-wide">
              {server.server_type}
            </span>
          )}
        </div>

        {server.command && (
          <div className="mb-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Command
            </span>
            <div className="font-mono text-xs text-zinc-300 mt-0.5 bg-mentat-bg rounded px-2 py-1.5 break-all">
              {server.command}
              {server.args && server.args.length > 0 && (
                <span className="text-zinc-500">
                  {" "}
                  {server.args.join(" ")}
                </span>
              )}
            </div>
          </div>
        )}

        {server.url && (
          <div className="mb-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              URL
            </span>
            <div className="font-mono text-xs text-zinc-300 mt-0.5 bg-mentat-bg rounded px-2 py-1.5 break-all">
              {server.url}
            </div>
          </div>
        )}

        {envEntries.length > 0 && (
          <div>
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
                    {revealedKeys.has(key) ? value : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
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
      </div>
    </div>
  );
}
