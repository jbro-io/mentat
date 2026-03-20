import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "../sidebar/Sidebar";
import { PromptListPanel } from "../prompt-list/PromptListPanel";
import { EditorPanel } from "../editor/EditorPanel";
import { useUIStore } from "../../stores/useUIStore";

function ResizeHandle() {
  return (
    <PanelResizeHandle className="group relative w-px bg-zinc-700 hover:bg-indigo-500 transition-colors duration-150">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-zinc-600 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-active:bg-indigo-400 transition-opacity" />
    </PanelResizeHandle>
  );
}

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
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
  );
}
