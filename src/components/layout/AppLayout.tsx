import { useRef } from "react";
import { ComposeBar } from "../compose/ComposeBar";
import { Sidebar } from "../sidebar/Sidebar";
import { SyncStatus } from "../sidebar/SyncStatus";
import { PromptListPanel } from "../prompt-list/PromptListPanel";
import { EditorPanel } from "../editor/EditorPanel";
import { ProjectsView } from "../projects/ProjectsView";
import { McpsView } from "../mcps/McpsView";
import { ScratchesView } from "../scratches/ScratchesView";
import { ShortcutsDialog } from "../shared/ShortcutsDialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useComposeStore } from "../../stores/useComposeStore";
import { useUIStore } from "../../stores/useUIStore";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, DragHandle } from "../ui";

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const listCollapsed = useUIStore((s) => s.listCollapsed);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);
  const setNewScratchDialogOpen = useUIStore((s) => s.setNewScratchDialogOpen);
  const listWidth = useUIStore((s) => s.listWidth);
  const setListWidth = useUIStore((s) => s.setListWidth);
  const shortcutsDialogOpen = useUIStore((s) => s.shortcutsDialogOpen);
  const setShortcutsDialogOpen = useUIStore((s) => s.setShortcutsDialogOpen);
  const isComposing = useComposeStore((s) => s.isComposing);
  const selectedPaths = useComposeStore((s) => s.selectedPaths);
  const promptListRef = useRef<HTMLDivElement>(null);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <TabsList className="justify-between">
        <div className="flex items-center flex-shrink-0">
          <span className="text-sm font-semibold text-mentat-accent tracking-wide uppercase ml-2 mr-4 select-none">
            Mentat
          </span>
          <div className="flex items-center">
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="scratches">Scratches</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="mcps">MCPs</TabsTrigger>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-3 flex-shrink-0">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="primary" size="sm" className="gap-1">
                + New
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[200px] bg-mentat-bg-raised border border-mentat-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 backdrop-blur-xl animate-[scaleIn_150ms_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{ transformOrigin: "top right" }}
                sideOffset={8}
                align="end"
              >
                <div className="p-1.5">
                  <DropdownMenu.Item
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 cursor-pointer outline-none rounded-lg data-[highlighted]:bg-mentat-accent/10 data-[highlighted]:text-mentat-accent transition-colors"
                    onSelect={() => {
                      setNewPromptDialogOpen(true);
                      setActiveTab("prompts");
                    }}
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-mentat-bg text-mentat-accent text-xs font-mono border border-mentat-border">
                      P
                    </span>
                    <div>
                      <div className="font-medium">New Prompt</div>
                      <div className="text-[11px] text-zinc-500">Create a reusable prompt template</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 cursor-pointer outline-none rounded-lg data-[highlighted]:bg-mentat-accent/10 data-[highlighted]:text-mentat-accent transition-colors"
                    onSelect={() => {
                      setNewScratchDialogOpen(true);
                      setActiveTab("scratches");
                    }}
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-mentat-bg text-yellow-400 text-xs font-mono border border-mentat-border">
                      S
                    </span>
                    <div>
                      <div className="font-medium">New Scratch</div>
                      <div className="text-[11px] text-zinc-500">Quick note in any language</div>
                    </div>
                  </DropdownMenu.Item>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </TabsList>

      <TabsContent value="prompts" className="flex-1 min-h-0">
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0 flex">
            {/* Sidebar with slide animation — only in Prompts tab */}
            <div
              className="h-full overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: sidebarCollapsed ? 0 : 240, minWidth: sidebarCollapsed ? 0 : 200 }}
            >
              <div className="h-full w-[240px] min-w-[200px]">
                <Sidebar />
              </div>
            </div>

            {/* List panel with slide animation + resize handle */}
            <div
              ref={promptListRef}
              className="h-full overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={listCollapsed ? { width: 0, flex: "0 0 0px" } : { flex: `0 0 ${listWidth}px` }}
            >
              <div className="h-full min-w-[200px]">
                <PromptListPanel />
              </div>
            </div>

            {!listCollapsed && <DragHandle containerRef={promptListRef} onWidthChange={setListWidth} />}

            <div className="flex-1 min-w-0 h-full">
              <EditorPanel />
            </div>
          </div>
          {isComposing && selectedPaths.length > 0 && <ComposeBar />}
        </div>
      </TabsContent>

      <TabsContent value="projects" className="flex-1 min-h-0">
        <ProjectsView />
      </TabsContent>

      <TabsContent value="mcps" className="flex-1 min-h-0">
        <McpsView />
      </TabsContent>

      <TabsContent value="scratches" className="flex-1 min-h-0">
        <ScratchesView />
      </TabsContent>

      {/* Footer — always visible */}
      <div className="bg-mentat-bg-deep border-t border-mentat-border flex items-center justify-between px-4 py-1">
        <button
          onClick={() => setShortcutsDialogOpen(true)}
          className="text-zinc-500 hover:text-mentat-accent transition-colors"
          aria-label="Keyboard shortcuts"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
            <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
          </svg>
        </button>
        <SyncStatus />
      </div>

      <ShortcutsDialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen} />
    </Tabs>
  );
}
