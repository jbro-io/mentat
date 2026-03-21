import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ComposeBar } from "../compose/ComposeBar";
import { Sidebar } from "../sidebar/Sidebar";
import { PromptListPanel } from "../prompt-list/PromptListPanel";
import { EditorPanel } from "../editor/EditorPanel";
import { ProjectsView } from "../projects/ProjectsView";
import { McpsView } from "../mcps/McpsView";
import { ScratchesView } from "../scratches/ScratchesView";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useComposeStore } from "../../stores/useComposeStore";
import { useUIStore } from "../../stores/useUIStore";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button } from "../ui";

function ResizeHandle() {
  return (
    <PanelResizeHandle className="group relative w-px bg-zinc-700 hover:bg-mentat-accent-hover transition-colors duration-150">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-zinc-600 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-active:bg-mentat-accent transition-opacity" />
    </PanelResizeHandle>
  );
}

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);
  const setNewScratchDialogOpen = useUIStore((s) => s.setNewScratchDialogOpen);
  const isComposing = useComposeStore((s) => s.isComposing);
  const selectedPaths = useComposeStore((s) => s.selectedPaths);

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

            <PanelGroup direction="horizontal" className="flex-1 min-w-0 h-full">
              <Panel defaultSize={40} minSize={20}>
                <PromptListPanel />
              </Panel>
              <ResizeHandle />
              <Panel defaultSize={60} minSize={30}>
                <EditorPanel />
              </Panel>
            </PanelGroup>
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
    </Tabs>
  );
}
