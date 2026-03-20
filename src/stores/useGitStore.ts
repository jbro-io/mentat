import { create } from "zustand";
import type { GitStatus } from "../types/git";
import * as api from "../lib/tauri";

interface GitStore {
  status: GitStatus | null;
  isSyncing: boolean;
  lastError: string | null;
  remoteUrl: string | null;

  fetchStatus: () => Promise<void>;
  sync: () => Promise<void>;
  initRepo: () => Promise<void>;
  addRemote: (url: string) => Promise<void>;
  fetchRemoteUrl: () => Promise<void>;
}

export const useGitStore = create<GitStore>((set, get) => ({
  status: null,
  isSyncing: false,
  lastError: null,
  remoteUrl: null,

  fetchStatus: async () => {
    try {
      const status = await api.gitSyncStatus();
      set({ status, lastError: null });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  sync: async () => {
    set({ isSyncing: true, lastError: null });
    try {
      const result = await api.gitSync();
      if (!result.success) {
        set({ lastError: result.message });
      }
      await get().fetchStatus();
    } catch (e) {
      set({ lastError: String(e) });
    } finally {
      set({ isSyncing: false });
    }
  },

  initRepo: async () => {
    try {
      await api.gitInit();
      await get().fetchStatus();
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  addRemote: async (url: string) => {
    set({ lastError: null });
    try {
      await api.gitAddRemote(url);
      set({ remoteUrl: url });
      await get().fetchStatus();
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  fetchRemoteUrl: async () => {
    try {
      const url = await api.gitGetRemoteUrl();
      set({ remoteUrl: url });
    } catch {
      // Not a git repo or no remote — fine
    }
  },
}));
