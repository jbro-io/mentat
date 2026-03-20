import { useEffect } from "react";
import { useUIStore } from "../stores/useUIStore";

export function useKeyboardShortcuts() {
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const editorMode = useUIStore((s) => s.editorMode);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+K -- command palette
      if (meta && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }

      // Cmd+/ -- toggle sidebar
      if (meta && e.key === "/") {
        e.preventDefault();
        toggleSidebar();
      }

      // Cmd+E -- toggle edit/preview
      if (meta && e.key === "e") {
        e.preventDefault();
        setEditorMode(editorMode === "edit" ? "preview" : "edit");
      }

      // Cmd+N -- new prompt
      if (meta && e.key === "n") {
        e.preventDefault();
        setNewPromptDialogOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleCommandPalette, toggleSidebar, setEditorMode, editorMode, setNewPromptDialogOpen]);
}
