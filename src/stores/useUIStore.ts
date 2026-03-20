import { create } from "zustand";

interface UIStore {
  commandPaletteOpen: boolean;
  editorMode: "edit" | "preview";
  sidebarCollapsed: boolean;
  newPromptDialogOpen: boolean;

  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setEditorMode: (mode: "edit" | "preview") => void;
  toggleSidebar: () => void;
  setNewPromptDialogOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  commandPaletteOpen: false,
  editorMode: "edit",
  sidebarCollapsed: false,
  newPromptDialogOpen: false,

  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),
  setEditorMode: (mode: "edit" | "preview") => set({ editorMode: mode }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setNewPromptDialogOpen: (open: boolean) => set({ newPromptDialogOpen: open }),
}));
