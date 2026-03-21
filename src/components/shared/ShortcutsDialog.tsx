import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  action: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["\u2318+1/2/3/4"], action: "Switch tabs" },
      { keys: ["\u2318+K"], action: "Command palette" },
      { keys: ["\u2318+F"], action: "Search prompts" },
      { keys: ["\u2318+B"], action: "Toggle list panel" },
      { keys: ["\u2318+/"], action: "Toggle sidebar" },
      { keys: ["j", "k"], action: "Navigate list items" },
      { keys: ["l", "Enter"], action: "Open selected item" },
      { keys: ["\u2192"], action: "Focus editor" },
      { keys: ["g", "G"], action: "Jump to top / bottom" },
      { keys: ["/"], action: "Focus search (in list)" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: ["\u2318+S"], action: "Save prompt" },
      { keys: ["\u2318+E"], action: "Toggle edit / preview" },
      { keys: ["\u2318+N"], action: "New prompt / scratch" },
      { keys: ["\u2318+D"], action: "Stage / dispatch prompt" },
    ],
  },
  {
    title: "Neovim",
    shortcuts: [
      { keys: ["<leader>e"], action: "Save and focus list" },
      { keys: ["<leader>s"], action: "Send to terminal" },
      { keys: [":w"], action: "Save to file" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="bg-mentat-bg-raised border border-mentat-border rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
      {children}
    </kbd>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-zinc-400">{shortcut.action}</span>
      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
        {shortcut.keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-zinc-600">/</span>}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

function ShortcutSection({ group }: { group: ShortcutGroup }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
        {group.title}
      </h3>
      <div className="space-y-0.5">
        {group.shortcuts.map((shortcut, i) => (
          <ShortcutRow key={i} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[560px] !max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-5">
          <div className="space-y-5">
            <ShortcutSection group={shortcutGroups[0]} />
          </div>
          <div className="space-y-5">
            <ShortcutSection group={shortcutGroups[1]} />
            <ShortcutSection group={shortcutGroups[2]} />
          </div>
        </div>
        <div className="px-5 pb-3 flex justify-end">
          <span className="text-[10px] text-zinc-600">
            Press <Kbd>{"\u2318+?"}</Kbd> to toggle this dialog
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
