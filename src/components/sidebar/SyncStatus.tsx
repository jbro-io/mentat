import { useState, useEffect } from "react";
import { useGitStore } from "../../stores/useGitStore";

export function SyncStatus() {
  const status = useGitStore((s) => s.status);
  const isSyncing = useGitStore((s) => s.isSyncing);
  const lastError = useGitStore((s) => s.lastError);
  const remoteUrl = useGitStore((s) => s.remoteUrl);
  const sync = useGitStore((s) => s.sync);
  const initRepo = useGitStore((s) => s.initRepo);
  const addRemote = useGitStore((s) => s.addRemote);
  const fetchRemoteUrl = useGitStore((s) => s.fetchRemoteUrl);

  const [showSetup, setShowSetup] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchRemoteUrl();
  }, [fetchRemoteUrl]);

  const handleConnect = async () => {
    if (!urlInput.trim()) return;
    setIsConnecting(true);
    await addRemote(urlInput.trim());
    setIsConnecting(false);
    setShowSetup(false);
    setUrlInput("");
  };

  // Setup form
  if (showSetup) {
    return (
      <div className="p-3 border-t border-mentat-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">Connect Repository</span>
          <button
            onClick={() => setShowSetup(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-[10px] text-zinc-500">
          Paste a GitHub repo URL to sync your prompts across devices.
        </p>
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConnect();
            if (e.key === "Escape") setShowSetup(false);
          }}
          placeholder="git@github.com:user/prompts.git"
          autoFocus
          className="w-full bg-mentat-bg-raised border border-mentat-border rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent"
        />
        <button
          onClick={handleConnect}
          disabled={!urlInput.trim() || isConnecting}
          className="w-full text-xs px-2 py-1 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? "Connecting..." : "Connect & Sync"}
        </button>
        {lastError && (
          <p className="text-[10px] text-red-400 break-words">{lastError}</p>
        )}
      </div>
    );
  }

  // No git repo or no remote — show setup prompt
  if (!status || (!status.has_remote && !remoteUrl)) {
    return (
      <div className="p-3 border-t border-mentat-border">
        <button
          onClick={async () => {
            if (status && !status.branch) {
              await initRepo();
            }
            setShowSetup(true);
          }}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-mentat-accent transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
          Set up Git sync
        </button>
      </div>
    );
  }

  // Normal sync status
  let dotColor = "bg-green-500";
  if (lastError) {
    dotColor = "bg-red-500";
  } else if (status.has_changes || status.ahead > 0) {
    dotColor = "bg-yellow-500";
  }

  let statusText = "Synced";
  if (lastError) {
    statusText = "Sync error";
  } else if (status.has_changes) {
    statusText = "Unsynced changes";
  } else if (status.ahead > 0) {
    statusText = `${status.ahead} ahead`;
  } else if (status.behind > 0) {
    statusText = `${status.behind} behind`;
  }

  return (
    <div className="p-3 border-t border-mentat-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
          <span className="text-xs text-zinc-400 truncate">{statusText}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={sync}
            disabled={isSyncing}
            className="text-xs px-2 py-0.5 rounded bg-mentat-bg-raised text-zinc-300 hover:bg-mentat-bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? "Syncing..." : "Sync"}
          </button>
          <button
            onClick={() => setShowSetup(true)}
            className="text-xs px-1 py-0.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
            title={remoteUrl || "Configure remote"}
          >
            ...
          </button>
        </div>
      </div>
      {lastError && (
        <p className="text-[10px] text-red-400 mt-1 truncate" title={lastError}>
          {lastError}
        </p>
      )}
    </div>
  );
}
