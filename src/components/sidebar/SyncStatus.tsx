import { useState, useEffect } from "react";
import { useGitStore } from "../../stores/useGitStore";
import { Input, Button } from "../ui";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={spinning ? { animation: "spin 1s linear infinite" } : undefined}
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

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

  // Setup form (opens as a popover-like panel above the footer)
  if (showSetup) {
    return (
      <div className="px-3 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-zinc-300">Connect Repository</span>
          <button
            onClick={() => setShowSetup(false)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
        <div className="flex gap-1.5">
          <Input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConnect();
              if (e.key === "Escape") setShowSetup(false);
            }}
            placeholder="git@github.com:user/prompts.git"
            autoFocus
            className="text-[10px] px-2 py-0.5 h-6"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnect}
            disabled={!urlInput.trim() || isConnecting}
            className="text-[10px] px-2 py-0 h-6"
          >
            {isConnecting ? "..." : "Connect"}
          </Button>
        </div>
        {lastError && (
          <p className="text-[10px] text-red-400 truncate">{lastError}</p>
        )}
      </div>
    );
  }

  // No git repo or no remote
  if (!status || (!status.has_remote && !remoteUrl)) {
    return (
      <div className="px-4 py-1 flex items-center justify-end">
        <button
          onClick={async () => {
            if (status && !status.branch) await initRepo();
            setShowSetup(true);
          }}
          className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-mentat-accent transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          Set up sync
        </button>
      </div>
    );
  }

  // Normal status
  let dotColor = "bg-green-500";
  if (lastError) {
    dotColor = "bg-red-500";
  } else if (status.has_changes || status.ahead > 0) {
    dotColor = "bg-yellow-500";
  }

  let statusText = "Synced";
  if (lastError) {
    statusText = "Error";
  } else if (status.has_changes) {
    statusText = "Unsynced";
  } else if (status.ahead > 0) {
    statusText = `${status.ahead} ahead`;
  } else if (status.behind > 0) {
    statusText = `${status.behind} behind`;
  }

  return (
    <div className="px-4 py-1 flex items-center justify-end gap-3">
      {lastError && (
        <span className="text-[10px] text-red-400 truncate mr-auto" title={lastError}>
          {lastError}
        </span>
      )}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="text-[10px] text-zinc-500">{statusText}</span>
      <button
        onClick={sync}
        disabled={isSyncing}
        className="text-zinc-500 hover:text-mentat-accent disabled:opacity-50 transition-colors"
        title="Sync"
      >
        <RefreshIcon spinning={isSyncing} />
      </button>
      <button
        onClick={() => setShowSetup(true)}
        className="text-zinc-500 hover:text-mentat-accent transition-colors"
        title={remoteUrl || "Configure sync"}
      >
        <CogIcon />
      </button>
    </div>
  );
}
