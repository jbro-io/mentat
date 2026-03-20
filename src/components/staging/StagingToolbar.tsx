import { useState, useEffect, useCallback } from "react";
import { useStagingStore } from "../../stores/useStagingStore";
import { useToastStore } from "../../stores/useToastStore";
import * as api from "../../lib/tauri";
import type { TerminalSession } from "../../lib/tauri";

export function StagingToolbar() {
  const stagedPrompt = useStagingStore((s) => s.stagedPrompt);
  const dispatch = useStagingStore((s) => s.dispatch);
  const clearStaging = useStagingStore((s) => s.clearStaging);
  const setSelectedTerminalSessionId = useStagingStore((s) => s.setSelectedTerminalSessionId);
  const showToast = useToastStore((s) => s.showToast);

  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Fetch sessions once on mount, and on-demand when dropdown is opened
  const fetchSessions = useCallback(async () => {
    try {
      const found = await api.listTerminalSessions();
      setSessions(found);
      setSelectedId((prev) => {
        if (prev && found.some((s) => s.id === prev)) return prev;
        return found.length > 0 ? found[0].id : "";
      });
    } catch {
      // iTerm not running or no sessions
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Sync selected session to the store so neovim's <leader>s can access it
  useEffect(() => {
    setSelectedTerminalSessionId(selectedId || null);
  }, [selectedId, setSelectedTerminalSessionId]);

  const handleSend = async () => {
    if (!selectedId) {
      showToast("No terminal session selected");
      return;
    }
    setIsSending(true);
    try {
      const { workingBody: body, variableValues: vars } = useStagingStore.getState();
      const resolved = await api.resolvePrompt(body, vars);
      await api.sendToTerminal(selectedId, resolved.trimEnd());
      showToast("Sent to terminal!");
    } catch (e) {
      showToast("Failed to send: " + String(e));
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyResolved = async () => {
    try {
      await dispatch("clipboard");
      showToast("Copied!");
    } catch {
      showToast("Failed to copy");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-mentat-border bg-mentat-bg-raised gap-3">
      <h2 className="text-sm font-medium text-mentat-accent truncate">
        Staging: {stagedPrompt?.meta.title ?? ""}
      </h2>
      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={selectedId}
          onFocus={fetchSessions}
          onChange={(e) => setSelectedId(e.target.value)}
          className="text-xs bg-mentat-bg-raised border border-mentat-border rounded px-2 py-1 text-zinc-300 max-w-[200px] truncate"
        >
          {sessions.length === 0 && (
            <option value="">No sessions</option>
          )}
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleSend}
          disabled={isSending || !selectedId}
          className="text-xs px-2 py-1 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover disabled:opacity-50 transition-colors"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
        <button
          onClick={handleCopyResolved}
          className="text-xs px-2 py-1 rounded bg-mentat-bg-raised text-zinc-300 border border-mentat-border hover:bg-mentat-bg-surface transition-colors"
          title="Cmd+D"
        >
          Copy
        </button>
        <button
          onClick={clearStaging}
          className="text-xs px-2 py-1 rounded bg-mentat-bg-raised text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-surface transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
