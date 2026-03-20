import { create } from "zustand";
import * as api from "../lib/tauri";

interface PersistedSettings {
  editorPreference?: "codemirror" | "neovim";
  sidebarCollapsed?: boolean;
}

interface UIStore {
  commandPaletteOpen: boolean;
  editorMode: "edit" | "preview";
  editorPreference: "codemirror" | "neovim";
  sidebarCollapsed: boolean;
  newPromptDialogOpen: boolean;
  promptListFocusRequested: number; // incremented to trigger focus
  editorFocusRequested: number;

  loadSettings: () => Promise<void>;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setEditorMode: (mode: "edit" | "preview") => void;
  setEditorPreference: (pref: "codemirror" | "neovim") => void;
  toggleSidebar: () => void;
  setNewPromptDialogOpen: (open: boolean) => void;
  requestPromptListFocus: () => void;
  requestEditorFocus: () => void;
}

function persistSettings(state: UIStore) {
  const settings: PersistedSettings = {
    editorPreference: state.editorPreference,
    sidebarCollapsed: state.sidebarCollapsed,
  };
  api.saveSettings(JSON.stringify(settings, null, 2)).catch((e) => {
    console.error("Failed to save settings:", e);
  });
}

export const useUIStore = create<UIStore>((set, get) => ({
  commandPaletteOpen: false,
  editorMode: "edit",
  editorPreference: "codemirror",
  sidebarCollapsed: false,
  newPromptDialogOpen: false,
  promptListFocusRequested: 0,
  editorFocusRequested: 0,

  loadSettings: async () => {
    try {
      const raw = await api.loadSettings();
      const parsed: PersistedSettings = JSON.parse(raw);
      set({
        ...(parsed.editorPreference && { editorPreference: parsed.editorPreference }),
        ...(parsed.sidebarCollapsed !== undefined && { sidebarCollapsed: parsed.sidebarCollapsed }),
      });
    } catch {
      // No settings file or invalid JSON — use defaults
    }
  },

  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),
  setEditorMode: (mode: "edit" | "preview") => set({ editorMode: mode }),

  setEditorPreference: (pref: "codemirror" | "neovim") => {
    set({ editorPreference: pref });
    persistSettings({ ...get(), editorPreference: pref });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    persistSettings({ ...get(), sidebarCollapsed: next });
  },

  setNewPromptDialogOpen: (open: boolean) => set({ newPromptDialogOpen: open }),
  requestPromptListFocus: () => set((s) => ({ promptListFocusRequested: s.promptListFocusRequested + 1 })),
  requestEditorFocus: () => set((s) => ({ editorFocusRequested: s.editorFocusRequested + 1 })),
}));
