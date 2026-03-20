import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen } from "@tauri-apps/api/event";
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
  const mountedRef = useRef(false);
  const sidRef = useRef<string | null>(null);
  const updatePrompt = usePromptStore((s) => s.updatePrompt);
  const setEditorPreference = useUIStore((s) => s.setEditorPreference);
  const requestPromptListFocus = useUIStore((s) => s.requestPromptListFocus);
  const editorFocusRequested = useUIStore((s) => s.editorFocusRequested);
  const pendingInsert = useStagingStore((s) => s.pendingInsert);
  const clearPendingInsert = useStagingStore((s) => s.clearPendingInsert);

  const body = props.prompt ? props.prompt.body : props.initialBody;
  const promptRef = useRef(props.prompt);

  useEffect(() => {
    promptRef.current = props.prompt;
  }, [props.prompt]);

  // Focus the terminal when editor focus is requested (e.g. ArrowRight from prompt list)
  useEffect(() => {
    if (editorFocusRequested > 0 && terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [editorFocusRequested]);

  // When pendingInsert is set (user picked a prompt from the list while staging),
  // send it to neovim via the PTY using bracketed paste
  useEffect(() => {
    if (!pendingInsert || !sidRef.current) return;
    const sid = sidRef.current;
    const text = "\n\n---\n\n" + pendingInsert;
    const encoder = new TextEncoder();

    // ESC (ensure normal mode) → G (end of file) → o (open line below, insert mode)
    const setup = encoder.encode("\x1bGo");
    // Bracketed paste: tells neovim to treat this as pasted text (no key interpretation)
    const pasteStart = encoder.encode("\x1b[200~");
    const pasteBody = encoder.encode(text);
    const pasteEnd = encoder.encode("\x1b[201~");
    // ESC back to normal mode
    const finish = encoder.encode("\x1b");

    (async () => {
      await api.ptyWrite(sid, Array.from(setup));
      await api.ptyWrite(sid, Array.from(pasteStart));
      await api.ptyWrite(sid, Array.from(pasteBody));
      await api.ptyWrite(sid, Array.from(pasteEnd));
      await api.ptyWrite(sid, Array.from(finish));
    })();

    clearPendingInsert();
  }, [pendingInsert, clearPendingInsert]);

  // Read the temp file and persist the body back to the real prompt
  const handleSaveSignal = useCallback(
    async (sid: string) => {
      try {
        const editedBody = await api.ptyReadTemp(sid);
        const current = promptRef.current;
        if (current) {
          await updatePrompt({ ...current, body: editedBody });
        } else if (props.onSave) {
          props.onSave(editedBody);
        }
      } catch (err) {
        console.error("Failed to persist save:", err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.onSave, updatePrompt],
  );

  const handleNeovimExit = useCallback(
    async (sid: string) => {
      try {
        // Persist any final changes before closing
        await handleSaveSignal(sid);
        await api.ptyClose(sid);
      } catch (err) {
        console.error("Failed to close PTY session:", err);
      }
    },
    [handleSaveSignal],
  );

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    const sid = `nvim-${Date.now()}-${++sessionCounter}`;
    sidRef.current = sid;

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
    terminal.open(containerRef.current);
    fitAddon.fit();
    terminal.focus();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const rows = terminal.rows;
    const cols = terminal.cols;

    // Fix neovim's colon-separated true-color SGR for xterm.js
    const colonSgrRegex = /\x1b\[([34]8):2:(\d+):(\d+):(\d+)m/g;
    function fixColorSequences(text: string): string {
      return text.replace(colonSgrRegex, "\x1b[$1;2;$2;$3;$4m");
    }

    const focusSignal = "\x1b]9999;focus-prompt-list\x07";
    const saveSignal = "\x1b]9999;save-prompt\x07";
    const sendSignal = "\x1b]9999;send-to-terminal\x07";

    const unlistenOutput = listen<{ id: string; data: number[] }>(
      "pty-output",
      (event) => {
        if (event.payload.id === sid) {
          let text = new TextDecoder().decode(new Uint8Array(event.payload.data));

          if (text.includes(saveSignal)) {
            text = text.replace(saveSignal, "");
            handleSaveSignal(sid);
          }
          if (text.includes(focusSignal)) {
            text = text.replace(focusSignal, "");
            requestPromptListFocus();
          }
          if (text.includes(sendSignal)) {
            text = text.replace(sendSignal, "");
            // Read the temp file directly (neovim just saved it) and send
            const sessId = useStagingStore.getState().selectedTerminalSessionId;
            if (sessId) {
              api.ptyReadTemp(sid).then(async (body) => {
                const vars = useStagingStore.getState().variableValues;
                const resolved = await api.resolvePrompt(body, vars);
                await api.sendToTerminal(sessId, resolved.trimEnd());
              }).catch((err) => console.error("Failed to send:", err));
            }
          }

          if (text.length > 0) {
            terminal.write(fixColorSequences(text));
          }
        }
      },
    );

    const unlistenExited = listen<{ id: string }>("pty-exited", (event) => {
      if (event.payload.id === sid) {
        handleNeovimExit(sid);
      }
    });

    const onDataDisposable = terminal.onData((data) => {
      const bytes = Array.from(new TextEncoder().encode(data));
      api.ptyWrite(sid, bytes).catch((err) => {
        console.error("Failed to write to PTY:", err);
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        const newRows = terminalRef.current.rows;
        const newCols = terminalRef.current.cols;
        api.ptyResize(sid, newRows, newCols).catch((err) => {
          console.error("Failed to resize PTY:", err);
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    // Spawn neovim with just the body (no frontmatter)
    api
      .ptySpawn(sid, body, rows, cols)
      .catch((err) => {
        console.error("Failed to spawn neovim:", err);
        terminal.write(
          `\r\n\x1b[31mFailed to start neovim: ${String(err)}\x1b[0m\r\n` +
          "\x1b[33mFalling back to CodeMirror...\x1b[0m\r\n"
        );
        setTimeout(() => setEditorPreference("codemirror"), 2000);
      });

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      unlistenOutput.then((fn) => fn());
      unlistenExited.then((fn) => fn());
      terminal.dispose();
      mountedRef.current = false;

      api.ptyClose(sid).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prompt?.meta.id]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ backgroundColor: "#09131B" }}
    />
  );
}
