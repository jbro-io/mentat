import { create } from "zustand";
import * as api from "../lib/tauri";

interface PersistedSettings {
  editorPreference?: "codemirror" | "neovim";
  sidebarCollapsed?: boolean;
  listCollapsed?: boolean;
  listWidth?: number;
  scratchListWidth?: number;
  projectListWidth?: number;
}

interface UIStore {
  commandPaletteOpen: boolean;
  editorMode: "edit" | "preview";
  editorPreference: "codemirror" | "neovim";
  sidebarCollapsed: boolean;
  listCollapsed: boolean;
  listWidth: number;
  scratchListWidth: number;
  projectListWidth: number;
  newPromptDialogOpen: boolean;
  newScratchDialogOpen: boolean;
  promptListFocusRequested: number; // incremented to trigger focus
  editorFocusRequested: number;
  activeTab: string;
  tabs: string[];

  loadSettings: () => Promise<void>;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setEditorMode: (mode: "edit" | "preview") => void;
  setEditorPreference: (pref: "codemirror" | "neovim") => void;
  toggleSidebar: () => void;
  toggleList: () => void;
  setListWidth: (width: number) => void;
  setScratchListWidth: (width: number) => void;
  setProjectListWidth: (width: number) => void;
  setNewPromptDialogOpen: (open: boolean) => void;
  setNewScratchDialogOpen: (open: boolean) => void;
  requestPromptListFocus: () => void;
  requestEditorFocus: () => void;
  setActiveTab: (tab: string) => void;
  switchToTabByIndex: (index: number) => void;
}

function persistSettings(state: UIStore) {
  const settings: PersistedSettings = {
    editorPreference: state.editorPreference,
    sidebarCollapsed: state.sidebarCollapsed,
    listCollapsed: state.listCollapsed,
    listWidth: state.listWidth,
    scratchListWidth: state.scratchListWidth,
    projectListWidth: state.projectListWidth,
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
  listCollapsed: false,
  listWidth: 350,
  scratchListWidth: 300,
  projectListWidth: 300,
  newPromptDialogOpen: false,
  newScratchDialogOpen: false,
  promptListFocusRequested: 0,
  editorFocusRequested: 0,
  activeTab: "prompts",
  tabs: ["prompts", "scratches", "projects", "mcps"],

  loadSettings: async () => {
    try {
      const raw = await api.loadSettings();
      const parsed: PersistedSettings = JSON.parse(raw);
      set({
        ...(parsed.editorPreference && { editorPreference: parsed.editorPreference }),
        ...(parsed.sidebarCollapsed !== undefined && { sidebarCollapsed: parsed.sidebarCollapsed }),
        ...(parsed.listCollapsed !== undefined && { listCollapsed: parsed.listCollapsed }),
        ...(parsed.listWidth && { listWidth: parsed.listWidth }),
        ...(parsed.scratchListWidth && { scratchListWidth: parsed.scratchListWidth }),
        ...(parsed.projectListWidth && { projectListWidth: parsed.projectListWidth }),
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

  toggleList: () => {
    const next = !get().listCollapsed;
    set({ listCollapsed: next });
    persistSettings({ ...get(), listCollapsed: next });
  },

  setListWidth: (width: number) => {
    set({ listWidth: width });
    persistSettings({ ...get(), listWidth: width });
  },

  setScratchListWidth: (width: number) => {
    set({ scratchListWidth: width });
    persistSettings({ ...get(), scratchListWidth: width });
  },

  setProjectListWidth: (width: number) => {
    set({ projectListWidth: width });
    persistSettings({ ...get(), projectListWidth: width });
  },

  setNewPromptDialogOpen: (open: boolean) => set({ newPromptDialogOpen: open }),
  setNewScratchDialogOpen: (open: boolean) => set({ newScratchDialogOpen: open }),
  requestPromptListFocus: () => set((s) => ({ promptListFocusRequested: s.promptListFocusRequested + 1 })),
  requestEditorFocus: () => set((s) => ({ editorFocusRequested: s.editorFocusRequested + 1 })),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  switchToTabByIndex: (index: number) => {
    const { tabs } = get();
    if (index >= 0 && index < tabs.length) {
      set({ activeTab: tabs[index] });
    }
  },
}));
