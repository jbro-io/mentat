import { create } from "zustand";
import type { Prompt, PromptSummary } from "../types/prompt";
import type { PromptFilter } from "../types/filters";
import * as api from "../lib/tauri";

interface PromptStore {
  prompts: PromptSummary[];
  selectedPrompt: Prompt | null;
  folders: string[];
  tags: string[];
  isLoading: boolean;
  error: string | null;

  fetchPrompts: (filter?: PromptFilter) => Promise<void>;
  selectPrompt: (filePath: string) => Promise<void>;
  clearSelection: () => void;
  createPrompt: (prompt: Prompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (filePath: string) => Promise<void>;
  fetchFolders: () => Promise<void>;
  fetchTags: () => Promise<void>;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],
  selectedPrompt: null,
  folders: [],
  tags: [],
  isLoading: false,
  error: null,

  fetchPrompts: async (filter?: PromptFilter) => {
    set({ isLoading: true, error: null });
    try {
      const prompts = await api.listPrompts(filter);
      set({ prompts, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  selectPrompt: async (filePath: string) => {
    try {
      const prompt = await api.getPrompt(filePath);
      set({ selectedPrompt: prompt });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  clearSelection: () => set({ selectedPrompt: null }),

  createPrompt: async (prompt: Prompt) => {
    try {
      await api.createPrompt(prompt);
      await get().fetchPrompts();
      await get().fetchTags();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  updatePrompt: async (prompt: Prompt) => {
    try {
      const updated = await api.updatePrompt(prompt);
      set({ selectedPrompt: updated });
      await get().fetchPrompts();
      await get().fetchTags();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deletePrompt: async (filePath: string) => {
    try {
      await api.deletePrompt(filePath);
      set({ selectedPrompt: null });
      await get().fetchPrompts();
      await get().fetchTags();
      await get().fetchFolders();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchFolders: async () => {
    try {
      const folders = await api.listFolders();
      set({ folders });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchTags: async () => {
    try {
      const tags = await api.listTags();
      set({ tags });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
