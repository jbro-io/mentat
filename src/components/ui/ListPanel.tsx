import { useState, useEffect, useCallback, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  actions?: ReactNode;
}

interface ListPanelProps {
  items: ListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>, focusedId: string | null) => void;
  header?: ReactNode;
  emptyMessage?: string;
  focusRequested?: number;
  badgesPosition?: "inline" | "right";
}

export function ListPanel({
  items,
  selectedId,
  onSelect,
  onKeyDown,
  header,
  emptyMessage = "No items",
  focusRequested = 0,
  badgesPosition = "inline",
}: ListPanelProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [items.length]);

  useEffect(() => {
    if (focusRequested > 0 && containerRef.current) {
      containerRef.current.focus();
      if (selectedId) {
        const idx = items.findIndex((item) => item.id === selectedId);
        setFocusedIndex(idx >= 0 ? idx : 0);
      } else if (items.length > 0) {
        setFocusedIndex(0);
      }
    }
  }, [focusRequested, selectedId, items]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      // Let consumer handle first
      const focusedId = focusedIndex >= 0 ? items[focusedIndex]?.id ?? null : null;
      onKeyDown?.(e, focusedId);
      if (e.defaultPrevented) return;

      if (items.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if ((e.key === "Enter" || e.key === "l") && focusedIndex >= 0) {
        e.preventDefault();
        const item = items[focusedIndex];
        if (item) onSelect(item.id);
      } else if (e.key === "g" && !e.ctrlKey) {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "G") {
        e.preventDefault();
        setFocusedIndex(items.length - 1);
      }
    },
    [items, focusedIndex, onSelect, onKeyDown],
  );

  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelectorAll("[data-list-item]");
    el[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-mentat-bg"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {header && (
        <div className="p-3 border-b border-mentat-border flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {items.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, index) => (
            <ListPanelItem
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              isFocused={focusedIndex === index}
              onClick={() => onSelect(item.id)}
              index={index}
              badgesPosition={badgesPosition}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ListPanelItem({
  item,
  isSelected,
  isFocused,
  onClick,
  index,
  badgesPosition,
}: {
  item: ListItem;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
  index: number;
  badgesPosition: "inline" | "right";
}) {
  return (
    <div
      data-list-item
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index * 20, 300)}ms` }}
      className={[
        "group px-3 py-2.5 min-h-[58px] flex items-center cursor-pointer border-b border-mentat-border/50 transition-all duration-150 animate-[listItemIn_150ms_cubic-bezier(0.16,1,0.3,1)_both]",
        isSelected
          ? "bg-mentat-bg-surface border-l-2 border-l-mentat-accent"
          : isFocused
            ? "bg-mentat-bg-raised"
            : "hover:bg-mentat-bg-raised/50",
        isFocused && !isSelected ? "ring-1 ring-inset ring-mentat-accent/40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className={`min-w-0 flex-1 ${item.subtitle ? "" : "flex items-center gap-2"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-zinc-200 truncate">
              {item.title}
            </span>
            {badgesPosition === "inline" && item.badges}
          </div>
          {item.subtitle && (
            <div className="text-[10px] text-zinc-600 font-mono truncate mt-0.5">
              {item.subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {badgesPosition === "right" && item.badges}
          {item.actions}
        </div>
      </div>
    </div>
  );
}
