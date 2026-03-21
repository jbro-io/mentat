import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { spawn } from "tauri-pty";
import type { IPty } from "tauri-pty";
import type { ScratchFile } from "../../lib/tauri";
import { useScratchStore } from "../../stores/useScratchStore";
import * as api from "../../lib/tauri";
import "@xterm/xterm/css/xterm.css";

interface Props {
  scratch: ScratchFile;
}

export function ScratchEditor({ scratch }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyRef = useRef<IPty | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(false);
  const requestScratchListFocus = useScratchStore((s) => s.requestScratchListFocus);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

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

    // Color fix regex (same as NeovimEditor)
    const colorRegex = /\x1b\[([34]8):2:(\d+):(\d+):(\d+)m/g;
    const focusSignal = "\x1b]9999;focus-prompt-list\x07";

    (async () => {
      if (!mountedRef.current) return;

      const home = await api.getEnvVar("HOME");

      // Spawn nvim directly on the scratch file (no temp file)
      const pty = spawn("/opt/homebrew/bin/nvim", [
        "-u", `${home}/.mentat/nvim-init.lua`,
        "--noplugin",
        scratch.path,
      ], { cols, rows });

      ptyRef.current = pty;

      const decoder = new TextDecoder();
      const dataDisp = pty.onData((data: unknown) => {
        let processed = Array.isArray(data)
          ? decoder.decode(new Uint8Array(data))
          : typeof data === "string" ? data : decoder.decode(data as Uint8Array);

        // Handle focus signal (<leader>e in nvim-init.lua)
        if (processed.includes(focusSignal)) {
          processed = processed.replaceAll(focusSignal, "");
          requestScratchListFocus();
        }

        if (processed.length > 0) {
          terminal.write(processed.replace(colorRegex, "\x1b[$1;2;$2;$3;$4m"));
        }
      });

      const exitDisp = pty.onExit(() => {
        // No special save handling needed — :w saves directly to the file
      });

      const inputDisp = terminal.onData((data) => {
        pty.write(data);
      });

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
      console.error("Failed to spawn neovim for scratch:", err);
      terminal.write(
        `\r\n\x1b[31mFailed to start neovim: ${String(err)}\x1b[0m\r\n`
      );
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
  }, [scratch.path]);

  return (
    <div ref={containerRef} className="h-full w-full" style={{ backgroundColor: "#09131B" }} />
  );
}
