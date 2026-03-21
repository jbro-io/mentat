import { create } from "zustand";
import * as api from "../lib/tauri";
import type { ScratchFile } from "../lib/tauri";

interface ScratchStore {
  scratches: ScratchFile[];
  selectedScratch: ScratchFile | null;
  scratchListFocusRequested: number;

  fetchScratches: () => Promise<void>;
  selectScratch: (scratch: ScratchFile | null) => void;
  createScratch: (name: string, language: string) => Promise<ScratchFile>;
  deleteScratch: (path: string) => Promise<void>;
  requestScratchListFocus: () => void;
}

export const useScratchStore = create<ScratchStore>((set, get) => ({
  scratches: [],
  selectedScratch: null,
  scratchListFocusRequested: 0,

  fetchScratches: async () => {
    try {
      const scratches = await api.listScratches();
      set({ scratches });
    } catch (e) {
      console.error("Failed to fetch scratches:", e);
    }
  },

  selectScratch: (scratch) => {
    set({ selectedScratch: scratch });
  },

  createScratch: async (name, language) => {
    const scratch = await api.createScratch(name, language);
    await get().fetchScratches();
    set({ selectedScratch: scratch });
    return scratch;
  },

  deleteScratch: async (path) => {
    const { selectedScratch } = get();
    await api.deleteScratch(path);
    if (selectedScratch?.path === path) {
      set({ selectedScratch: null });
    }
    await get().fetchScratches();
  },

  requestScratchListFocus: () =>
    set((s) => ({ scratchListFocusRequested: s.scratchListFocusRequested + 1 })),
}));
