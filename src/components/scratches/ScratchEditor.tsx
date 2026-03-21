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
  const requestScratchListFocus = useScratchStore((s) => s.requestScratchListFocus);

  // Single effect: create terminal + PTY on mount, dispose everything on unmount.
  // Parent uses key={scratch.path} so this fully remounts per scratch.
  useEffect(() => {
    if (!containerRef.current) return;
    // Capture in a const so TS knows it's non-null inside closures
    const container: HTMLDivElement = containerRef.current;

    let aborted = false;
    let pty: IPty | null = null;
    let dataDisp: { dispose(): void } | null = null;
    let exitDisp: { dispose(): void } | null = null;
    let inputDisp: { dispose(): void } | null = null;

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

    const colorRegex = /\x1b\[([34]8):2:(\d+):(\d+):(\d+)m/g;
    const focusSignal = "\x1b]9999;focus-prompt-list\x07";

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
    tryOpenAndFit();

    // Debounce spawn to handle rapid mount/unmount from fast switching
    const spawnTimer = setTimeout(() => {
      if (aborted) return;

      (async () => {
        if (aborted) return;

        const home = await api.getEnvVar("HOME");
        if (aborted) return;

        pty = spawn("/opt/homebrew/bin/nvim", [
          "-u", `${home}/.mentat/nvim-init.lua`,
          "--noplugin",
          scratch.path,
        ], { cols: terminal.cols || 80, rows: terminal.rows || 24 });

        if (aborted) { pty.kill(); pty = null; return; }

        const decoder = new TextDecoder();
        dataDisp = pty.onData((data: unknown) => {
          if (aborted) return;
          let processed = Array.isArray(data)
            ? decoder.decode(new Uint8Array(data))
            : typeof data === "string" ? data : decoder.decode(data as Uint8Array);

          if (processed.includes(focusSignal)) {
            processed = processed.replaceAll(focusSignal, "");
            requestScratchListFocus();
          }

          if (processed.length > 0) {
            terminal.write(processed.replace(colorRegex, "\x1b[$1;2;$2;$3;$4m"));
          }
        });

        exitDisp = pty.onExit(() => {
          // No special save handling — :w saves directly to the file
        });

        inputDisp = terminal.onData((data) => {
          if (!aborted && pty) pty.write(data);
        });

        terminal.focus();
      })().catch((err) => {
        if (aborted) return;
        console.error("Failed to spawn neovim for scratch:", err);
        terminal.write(
          `\r\n\x1b[31mFailed to start neovim: ${String(err)}\x1b[0m\r\n`
        );
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
      terminal.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="w-full pt-2" style={{ backgroundColor: "#09131B", height: "calc(100% - 8px)" }} />
  );
}
