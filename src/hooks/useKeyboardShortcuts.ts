import { useEffect } from "react";
import { useUIStore } from "../stores/useUIStore";
import { usePromptStore } from "../stores/usePromptStore";
import { useStagingStore } from "../stores/useStagingStore";
import { useToastStore } from "../stores/useToastStore";

export function useKeyboardShortcuts() {
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleList = useUIStore((s) => s.toggleList);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const editorMode = useUIStore((s) => s.editorMode);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);
  const switchToTabByIndex = useUIStore((s) => s.switchToTabByIndex);
  const selectedPrompt = usePromptStore((s) => s.selectedPrompt);
  const isStaging = useStagingStore((s) => s.isStaging);
  const stagePrompt = useStagingStore((s) => s.stagePrompt);
  const dispatch = useStagingStore((s) => s.dispatch);
  const showToast = useToastStore((s) => s.showToast);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+1/2/3/... -- switch tabs
      if (meta && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        switchToTabByIndex(parseInt(e.key) - 1);
      }

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

      // Cmd+B -- toggle list panel
      if (meta && e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleList();
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

      // Cmd+D -- stage prompt or dispatch if already staging
      if (meta && e.key === "d") {
        e.preventDefault();
        if (isStaging) {
          dispatch("clipboard").then(
            () => showToast("Resolved prompt copied to clipboard!"),
            () => showToast("Failed to copy resolved prompt"),
          );
        } else if (selectedPrompt) {
          stagePrompt(selectedPrompt);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleCommandPalette, toggleSidebar, toggleList, setEditorMode, editorMode, setNewPromptDialogOpen, switchToTabByIndex, selectedPrompt, isStaging, stagePrompt, dispatch, showToast]);
}
