import { Command } from "cmdk";
import { useUIStore } from "../../stores/useUIStore";
import { usePromptStore } from "../../stores/usePromptStore";
import { useComposeStore } from "../../stores/useComposeStore";
import { useEffect, useState, useCallback, useRef } from "react";
import type { SearchResult } from "../../types/prompt";
import * as api from "../../lib/tauri";

interface ActionCommand {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const selectPrompt = usePromptStore((s) => s.selectPrompt);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const editorMode = useUIStore((s) => s.editorMode);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);
  const toggleComposing = useComposeStore((s) => s.toggleComposing);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actionCommands: ActionCommand[] = [
    {
      id: "new-prompt",
      label: "New Prompt",
      shortcut: "Cmd+N",
      action: () => {
        setOpen(false);
        setNewPromptDialogOpen(true);
      },
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      shortcut: "Cmd+/",
      action: () => {
        toggleSidebar();
        setOpen(false);
      },
    },
    {
      id: "toggle-preview",
      label: editorMode === "edit" ? "Switch to Preview" : "Switch to Edit",
      shortcut: "Cmd+E",
      action: () => {
        setEditorMode(editorMode === "edit" ? "preview" : "edit");
        setOpen(false);
      },
    },
    {
      id: "toggle-compose",
      label: "Toggle Compose Mode",
      action: () => {
        toggleComposing();
        setOpen(false);
      },
    },
  ];

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    // Debounce the IPC search call to avoid firing on every keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length === 0) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.fuzzySearch(q, 10);
        setResults(r);
      } catch {
        setResults([]);
      }
    }, 150);
  }, []);

  const handleSelect = useCallback(
    (filePath: string) => {
      selectPrompt(filePath);
      setOpen(false);
      setResults([]);
      setQuery("");
    },
    [selectPrompt, setOpen]
  );

  useEffect(() => {
    if (!open) {
      setResults([]);
      setQuery("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  // Filter action commands by query
  const filteredActions = query
    ? actionCommands.filter((a) =>
        a.label.toLowerCase().includes(query.toLowerCase())
      )
    : actionCommands;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <Command
        className="relative w-[560px] bg-mentat-bg border border-mentat-border rounded-xl shadow-2xl overflow-hidden"
        shouldFilter={false}
      >
        <Command.Input
          placeholder="Search prompts or type a command..."
          onValueChange={handleSearch}
          className="w-full bg-transparent px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none border-b border-mentat-border"
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-zinc-500">
            No results found
          </Command.Empty>

          {/* Action commands */}
          {filteredActions.length > 0 && (
            <Command.Group
              heading="Actions"
              className="text-[10px] uppercase tracking-wider text-zinc-600 px-3 pt-2 pb-1"
            >
              {filteredActions.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={cmd.id}
                  onSelect={cmd.action}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-300 cursor-pointer data-[selected=true]:bg-mentat-bg-raised data-[selected=true]:text-zinc-100"
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-mentat-bg-raised border border-mentat-border text-zinc-500 font-mono">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Search results */}
          {results.length > 0 && (
            <Command.Group
              heading="Prompts"
              className="text-[10px] uppercase tracking-wider text-zinc-600 px-3 pt-2 pb-1"
            >
              {results.map((result) => (
                <Command.Item
                  key={result.id}
                  value={result.file_path}
                  onSelect={() => handleSelect(result.file_path)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-300 cursor-pointer data-[selected=true]:bg-mentat-bg-raised data-[selected=true]:text-zinc-100"
                >
                  <span>{result.title}</span>
                  <span className="text-xs text-zinc-600">
                    {result.matched_field}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-mentat-border px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-600">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-mentat-bg-raised border border-mentat-border font-mono mr-1">
              esc
            </kbd>
            close
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-mentat-bg-raised border border-mentat-border font-mono mr-1">
              enter
            </kbd>
            select
          </span>
        </div>
      </Command>
    </div>
  );
}
