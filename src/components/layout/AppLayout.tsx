import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ComposeBar } from "../compose/ComposeBar";
import { Sidebar } from "../sidebar/Sidebar";
import { PromptListPanel } from "../prompt-list/PromptListPanel";
import { EditorPanel } from "../editor/EditorPanel";
import { useComposeStore } from "../../stores/useComposeStore";
import { useUIStore } from "../../stores/useUIStore";

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
  const isComposing = useComposeStore((s) => s.isComposing);
  const selectedPaths = useComposeStore((s) => s.selectedPaths);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full">
          {!sidebarCollapsed && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={30}>
                <Sidebar />
              </Panel>
              <ResizeHandle />
            </>
          )}
          <Panel defaultSize={30} minSize={20}>
            <PromptListPanel />
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={50} minSize={30}>
            <EditorPanel />
          </Panel>
        </PanelGroup>
      </div>
      {isComposing && selectedPaths.length > 0 && <ComposeBar />}
    </div>
  );
}
