import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { CommandPalette } from "./components/command-palette/CommandPalette";
import { NewPromptDialog } from "./components/editor/NewPromptDialog";
import { ToastContainer } from "./components/shared/Toast";
import { usePromptStore } from "./stores/usePromptStore";
import { useUIStore } from "./stores/useUIStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function App() {
  const fetchPrompts = usePromptStore((s) => s.fetchPrompts);
  const fetchFolders = usePromptStore((s) => s.fetchFolders);
  const fetchTags = usePromptStore((s) => s.fetchTags);
  const newPromptDialogOpen = useUIStore((s) => s.newPromptDialogOpen);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);

  useEffect(() => {
    fetchPrompts();
    fetchFolders();
    fetchTags();
  }, [fetchPrompts, fetchFolders, fetchTags]);

  useKeyboardShortcuts();

  return (
    <div className="h-screen w-screen bg-zinc-900 text-zinc-100 overflow-hidden">
      <CommandPalette />
      <NewPromptDialog
        open={newPromptDialogOpen}
        onClose={() => setNewPromptDialogOpen(false)}
      />
      <AppLayout />
      <ToastContainer />
    </div>
  );
}

export default App;
