import { useCallback } from "react";

interface DragHandleProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWidthChange?: (width: number) => void;
  min?: number;
  max?: number;
}

export function DragHandle({ containerRef, onWidthChange, min = 200, max = 600 }: DragHandleProps) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const startX = e.clientX;
    const startWidth = container.offsetWidth;
    container.style.transition = "none";
    let currentWidth = startWidth;
    const onMouseMove = (ev: MouseEvent) => {
      currentWidth = Math.max(min, Math.min(max, startWidth + (ev.clientX - startX)));
      container.style.width = `${currentWidth}px`;
      container.style.flex = `0 0 ${currentWidth}px`;
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      container.style.transition = "";
      onWidthChange?.(currentWidth);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [containerRef, onWidthChange, min, max]);

  return (
    <div
      className="group relative w-px bg-mentat-border hover:bg-mentat-accent-hover transition-colors duration-150 cursor-col-resize flex-shrink-0"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-zinc-600 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-active:bg-mentat-accent transition-opacity" />
    </div>
  );
}
