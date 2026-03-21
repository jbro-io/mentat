import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { spawn } from "tauri-pty";
import type { IPty } from "tauri-pty";
import type { Prompt } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import { useUIStore } from "../../stores/useUIStore";
import { useStagingStore } from "../../stores/useStagingStore";
import * as api from "../../lib/tauri";
import "@xterm/xterm/css/xterm.css";

interface PromptModeProps {
  prompt: Prompt;
  initialBody?: undefined;
  onSave?: undefined;
}

interface StandaloneProps {
  prompt?: undefined;
  initialBody: string;
  onSave: (body: string) => void;
}

type Props = PromptModeProps | StandaloneProps;

let sessionCounter = 0;

export function NeovimEditor(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyRef = useRef<IPty | null>(null);
  const tempIdRef = useRef<string>("");
  const updatePrompt = usePromptStore((s) => s.updatePrompt);
  const setEditorPreference = useUIStore((s) => s.setEditorPreference);
  const requestPromptListFocus = useUIStore((s) => s.requestPromptListFocus);
  const editorFocusRequested = useUIStore((s) => s.editorFocusRequested);
  const pendingInsert = useStagingStore((s) => s.pendingInsert);
  const clearPendingInsert = useStagingStore((s) => s.clearPendingInsert);

  const body = props.prompt ? props.prompt.body : props.initialBody;
  const promptRef = useRef(props.prompt);

  useEffect(() => { promptRef.current = props.prompt; }, [props.prompt]);

  useEffect(() => {
    if (editorFocusRequested > 0 && terminalRef.current) terminalRef.current.focus();
  }, [editorFocusRequested]);

  useEffect(() => {
    if (!pendingInsert || !ptyRef.current) return;
    ptyRef.current.write("\x1bGo\x1b[200~\n\n---\n\n" + pendingInsert + "\x1b[201~\x1b");
    clearPendingInsert();
  }, [pendingInsert, clearPendingInsert]);

  const handleSaveSignal = useCallback(async () => {
    try {
      const tid = tempIdRef.current;
      const editedBody = await api.readFile(`/tmp/mentat-edit-${tid}.md`);
      const current = promptRef.current;
      if (current) {
        await updatePrompt({ ...current, body: editedBody });
      } else if (props.onSave) {
        props.onSave(editedBody);
      }
    } catch (err) {
      console.error("Failed to persist save:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onSave, updatePrompt]);

  // Single effect: create terminal, spawn PTY, clean up everything on unmount.
  // The parent uses key={prompt.meta.id} so this component fully remounts
  // on prompt change — no need to handle prompt switches within the effect.
  useEffect(() => {
    if (!containerRef.current) return;
    // Capture in a const so TS knows it's non-null inside closures
    const container: HTMLDivElement = containerRef.current;

    let aborted = false;
    let pty: IPty | null = null;
    let dataDisp: { dispose(): void } | null = null;
    let exitDisp: { dispose(): void } | null = null;
    let inputDisp: { dispose(): void } | null = null;

    const tid = `${Date.now()}-${++sessionCounter}`;
    tempIdRef.current = tid;
    const tempPath = `/tmp/mentat-edit-${tid}.md`;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
      allowProposedApi: true,
      theme: {
        background: "#09131B",
        foreground: "#9FC75B",
        cursor: "#9FC75B",
        selectionBackground: "rgba(255, 255, 255, 0.15)",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const colorRegex = /\x1b\[([34]8):2:(\d+):(\d+):(\d+)m/g;
    const saveSignal = "\x1b]9999;save-prompt\x07";
    const focusSignal = "\x1b]9999;focus-prompt-list\x07";
    const sendSignal = "\x1b]9999;send-to-terminal\x07";

    // Wait for the container to have non-zero dimensions before opening
    // the terminal. This handles tab switches where the container starts hidden.
    let opened = false;

    function tryOpenAndFit() {
      if (aborted) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      if (!opened) {
        try {
          terminal.open(container);
          opened = true;
        } catch {
          return;
        }
      }
      try { fitAddon.fit(); } catch { /* renderer not ready yet */ }
      if (pty) {
        try { pty.resize(terminal.cols, terminal.rows); } catch { /* */ }
      }
    }

    const resizeObserver = new ResizeObserver(() => tryOpenAndFit());
    resizeObserver.observe(container);

    // Also try immediately in case container already has dimensions
    tryOpenAndFit();

    // Debounce the PTY spawn slightly so rapid mount/unmount cycles from
    // fast item switching don't create unnecessary PTY processes.
    const spawnTimer = setTimeout(() => {
      if (aborted) return;

      (async () => {
        if (aborted) return;
        await api.writeFile(tempPath, body);
        if (aborted) return;

        const home = await api.getEnvVar("HOME");
        if (aborted) return;

        pty = spawn("/opt/homebrew/bin/nvim", [
          "-u", `${home}/.mentat/nvim-init.lua`,
          "--noplugin",
          tempPath,
        ], { cols: terminal.cols || 80, rows: terminal.rows || 24 });

        if (aborted) { pty.kill(); pty = null; return; }
        ptyRef.current = pty;

        const decoder = new TextDecoder();
        dataDisp = pty.onData((data: unknown) => {
          if (aborted) return;
          let processed = Array.isArray(data)
            ? decoder.decode(new Uint8Array(data))
            : typeof data === "string" ? data : decoder.decode(data as Uint8Array);

          if (processed.includes(saveSignal)) {
            processed = processed.replaceAll(saveSignal, "");
            if (props.prompt) handleSaveSignal();
          }
          if (processed.includes(focusSignal)) {
            processed = processed.replaceAll(focusSignal, "");
            requestPromptListFocus();
          }
          if (processed.includes(sendSignal)) {
            processed = processed.replaceAll(sendSignal, "");
            const sessId = useStagingStore.getState().selectedTerminalSessionId;
            if (sessId) {
              api.readFile(tempPath).then(async (b) => {
                const vars = useStagingStore.getState().variableValues;
                const resolved = await api.resolvePrompt(b, vars);
                await api.sendToTerminal(sessId, resolved.trimEnd());
              }).catch(console.error);
            }
          }

          if (processed.length > 0) {
            terminal.write(processed.replace(colorRegex, "\x1b[$1;2;$2;$3;$4m"));
          }
        });

        exitDisp = pty.onExit(() => { if (!aborted) handleSaveSignal(); });
        inputDisp = terminal.onData((data) => { if (!aborted) pty!.write(data); });

        terminal.focus();
      })().catch((err) => {
        if (aborted) return;
        console.error("Failed to spawn neovim:", err);
        setTimeout(() => setEditorPreference("codemirror"), 2000);
      });
    }, 50);

    return () => {
      aborted = true;
      clearTimeout(spawnTimer);
      resizeObserver.disconnect();
      dataDisp?.dispose();
      exitDisp?.dispose();
      inputDisp?.dispose();
      if (pty) {
        try { pty.kill(); } catch { /* already exited */ }
      }
      ptyRef.current = null;
      terminalRef.current = null;
      fitAddonRef.current = null;
      terminal.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full" style={{ backgroundColor: "#09131B" }} />
  );
}
