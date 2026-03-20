import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { CommandPalette } from "./components/command-palette/CommandPalette";
import { NewPromptDialog } from "./components/editor/NewPromptDialog";
import { ToastContainer } from "./components/shared/Toast";
import { useGitStore } from "./stores/useGitStore";
import { useProjectStore } from "./stores/useProjectStore";
import { usePromptStore } from "./stores/usePromptStore";
import { useUIStore } from "./stores/useUIStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function App() {
  const fetchPrompts = usePromptStore((s) => s.fetchPrompts);
  const fetchFolders = usePromptStore((s) => s.fetchFolders);
  const fetchTags = usePromptStore((s) => s.fetchTags);
  const fetchGitStatus = useGitStore((s) => s.fetchStatus);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const loadSettings = useUIStore((s) => s.loadSettings);
  const newPromptDialogOpen = useUIStore((s) => s.newPromptDialogOpen);
  const setNewPromptDialogOpen = useUIStore((s) => s.setNewPromptDialogOpen);

  useEffect(() => {
    loadSettings();
    fetchPrompts();
    fetchFolders();
    fetchTags();
    fetchGitStatus();
    fetchProjects();
  }, [loadSettings, fetchPrompts, fetchFolders, fetchTags, fetchGitStatus, fetchProjects]);

  useKeyboardShortcuts();

  return (
    <div className="h-screen w-screen bg-mentat-bg text-zinc-200 overflow-hidden">
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
