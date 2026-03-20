import { create } from "zustand";
import type { PromptType, SearchResult } from "../types/prompt";
import type { PromptFilter } from "../types/filters";
import * as api from "../lib/tauri";

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SEARCH_DEBOUNCE_MS = 150;

interface FilterStore {
  searchQuery: string;
  searchResults: SearchResult[] | null;
  activeFilters: PromptFilter;

  setSearchQuery: (query: string) => void;
  executeSearch: () => Promise<void>;
  clearSearch: () => void;
  setTagFilter: (tags: string[]) => void;
  setTypeFilter: (type: PromptType | undefined) => void;
  setTargetFilter: (target: string | undefined) => void;
  setFolderFilter: (folder: string | undefined) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  searchQuery: "",
  searchResults: null,
  activeFilters: {},

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    // Debounce search to avoid firing an IPC call on every keystroke
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    if (query.length > 0) {
      searchDebounceTimer = setTimeout(() => {
        get().executeSearch();
      }, SEARCH_DEBOUNCE_MS);
    } else {
      set({ searchResults: null });
    }
  },

  executeSearch: async () => {
    const { searchQuery } = get();
    if (!searchQuery) return;
    try {
      const results = await api.fuzzySearch(searchQuery);
      // Only apply results if the query hasn't changed since we started
      if (get().searchQuery === searchQuery) {
        set({ searchResults: results });
      }
    } catch (e) {
      console.error("Search error:", e);
    }
  },

  clearSearch: () => set({ searchQuery: "", searchResults: null }),

  setTagFilter: (tags: string[]) =>
    set((s) => ({ activeFilters: { ...s.activeFilters, tags: tags.length > 0 ? tags : undefined } })),

  setTypeFilter: (type: PromptType | undefined) =>
    set((s) => ({ activeFilters: { ...s.activeFilters, prompt_type: type } })),

  setTargetFilter: (target: string | undefined) =>
    set((s) => ({ activeFilters: { ...s.activeFilters, target } })),

  setFolderFilter: (folder: string | undefined) =>
    set((s) => ({ activeFilters: { ...s.activeFilters, folder } })),

  clearFilters: () => set({ activeFilters: {} }),
}));
