import { create } from "zustand";
import * as api from "../lib/tauri";
import { useStagingStore } from "./useStagingStore";

interface ComposeStore {
  selectedPaths: string[];
  isComposing: boolean;

  toggleComposing: () => void;
  toggleSelection: (filePath: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  clearSelection: () => void;
  compose: () => Promise<void>;
}

export const useComposeStore = create<ComposeStore>((set, get) => ({
  selectedPaths: [],
  isComposing: false,

  toggleComposing: () => {
    const { isComposing } = get();
    if (isComposing) {
      // Exiting compose mode -- clear selections
      set({ isComposing: false, selectedPaths: [] });
    } else {
      set({ isComposing: true });
    }
  },

  toggleSelection: (filePath: string) => {
    const { selectedPaths } = get();
    if (selectedPaths.includes(filePath)) {
      set({ selectedPaths: selectedPaths.filter((p) => p !== filePath) });
    } else {
      set({ selectedPaths: [...selectedPaths, filePath] });
    }
  },

  reorder: (fromIndex: number, toIndex: number) => {
    const { selectedPaths } = get();
    if (
      fromIndex < 0 ||
      fromIndex >= selectedPaths.length ||
      toIndex < 0 ||
      toIndex >= selectedPaths.length
    ) {
      return;
    }
    const updated = [...selectedPaths];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    set({ selectedPaths: updated });
  },

  clearSelection: () => {
    set({ selectedPaths: [] });
  },

  compose: async () => {
    const { selectedPaths } = get();
    if (selectedPaths.length === 0) return;
    const composed = await api.composePrompts(selectedPaths);
    useStagingStore.getState().stagePrompt(composed);
    // Exit compose mode after composing
    set({ isComposing: false, selectedPaths: [] });
  },
}));
