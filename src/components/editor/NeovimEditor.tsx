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
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(false);
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

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

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
    terminal.open(containerRef.current);
    fitAddon.fit();
    terminal.focus();
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Color fix regex
    const colorRegex = /\x1b\[([34]8):2:(\d+):(\d+):(\d+)m/g;
    const saveSignal = "\x1b]9999;save-prompt\x07";
    const focusSignal = "\x1b]9999;focus-prompt-list\x07";
    const sendSignal = "\x1b]9999;send-to-terminal\x07";

    (async () => {
      // Double-mount guard (React strict mode calls effect twice)
      if (!mountedRef.current) return;

      // Write body to temp file
      await api.writeFile(tempPath, body);

      // Get HOME for nvim-init.lua path
      const home = await api.getEnvVar("HOME");

      // Spawn nvim directly (no shell wrapper)
      const pty = spawn("/opt/homebrew/bin/nvim", [
        "-u", `${home}/.mentat/nvim-init.lua`,
        "--noplugin",
        tempPath,
      ], { cols, rows });

      ptyRef.current = pty;

      // Output — plugin sends Array<number>, convert to string
      const decoder = new TextDecoder();
      const dataDisp = pty.onData((data: unknown) => {
        let processed = Array.isArray(data)
          ? decoder.decode(new Uint8Array(data))
          : typeof data === "string" ? data : decoder.decode(data as Uint8Array);
        if (processed.includes(saveSignal)) {
          processed = processed.replaceAll(saveSignal, "");
          // Only persist saves in prompt mode, not staging (avoids re-render per keystroke)
          if (props.prompt) {
            handleSaveSignal();
          }
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

      const exitDisp = pty.onExit(() => { handleSaveSignal(); });

      // Input — direct string write
      const inputDisp = terminal.onData((data) => { pty.write(data); });

      // Resize
      const resizeObs = new ResizeObserver(() => {
        if (fitAddonRef.current && terminalRef.current && ptyRef.current) {
          fitAddonRef.current.fit();
          ptyRef.current.resize(terminalRef.current.cols, terminalRef.current.rows);
        }
      });
      resizeObs.observe(containerRef.current!);

      cleanupRef.current = () => {
        inputDisp.dispose();
        dataDisp.dispose();
        exitDisp.dispose();
        resizeObs.disconnect();
        pty.kill();
        terminal.dispose();
        mountedRef.current = false;
        ptyRef.current = null;
      };
    })().catch((err) => {
      console.error("Failed to spawn neovim:", err);
      terminal.write(
        `\r\n\x1b[31mFailed to start neovim: ${String(err)}\x1b[0m\r\n` +
        "\x1b[33mFalling back to CodeMirror...\x1b[0m\r\n"
      );
      setTimeout(() => setEditorPreference("codemirror"), 2000);
    });

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      } else {
        terminal.dispose();
        mountedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prompt?.meta.id]);

  return (
    <div ref={containerRef} className="h-full w-full" style={{ backgroundColor: "#09131B" }} />
  );
}
