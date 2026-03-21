import { useEffect, useRef } from "react";
import { useScratchStore } from "../../stores/useScratchStore";
import { useUIStore } from "../../stores/useUIStore";
import { DragHandle } from "../ui";
import { ScratchList } from "./ScratchList";
import { ScratchEditor } from "./ScratchEditor";

export function ScratchesView() {
  const selectedScratch = useScratchStore((s) => s.selectedScratch);
  const fetchScratches = useScratchStore((s) => s.fetchScratches);
  const listCollapsed = useUIStore((s) => s.listCollapsed);
  const listWidth = useUIStore((s) => s.scratchListWidth);
  const setListWidth = useUIStore((s) => s.setScratchListWidth);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchScratches();
  }, [fetchScratches]);

  return (
    <div className="h-full flex bg-mentat-bg">
      <div
        ref={listRef}
        className="h-full overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={listCollapsed ? { width: 0, flex: "0 0 0px" } : { flex: `0 0 ${listWidth}px` }}
      >
        <div className="h-full min-w-[200px]">
          <ScratchList />
        </div>
      </div>

      {!listCollapsed && <DragHandle containerRef={listRef} onWidthChange={setListWidth} />}

      <div className="flex-1 min-w-0 h-full">
        {selectedScratch ? (
          <ScratchEditor key={selectedScratch.path} scratch={selectedScratch} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-zinc-600 text-sm mb-1">
                Select a scratch to edit
              </div>
              <div className="text-zinc-700 text-xs">
                Use j/k to navigate, Enter to select
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
