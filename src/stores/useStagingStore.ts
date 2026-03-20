import { create } from "zustand";
import type { Prompt } from "../types/prompt";
import { useProjectStore } from "./useProjectStore";
import * as api from "../lib/tauri";

interface StagingStore {
  stagedPrompt: Prompt | null;
  workingBody: string;
  variableValues: Record<string, string>;
  isStaging: boolean;
  pendingInsert: string | null;
  selectedTerminalSessionId: string | null;

  stagePrompt: (prompt: Prompt) => void;
  setVariableValue: (name: string, value: string) => void;
  setWorkingBody: (body: string) => void;
  insertPromptBody: (body: string) => void;
  clearPendingInsert: () => void;
  setSelectedTerminalSessionId: (id: string | null) => void;
  dispatch: (mode: "clipboard") => Promise<void>;
  clearStaging: () => void;
}

export const useStagingStore = create<StagingStore>((set, get) => ({
  stagedPrompt: null,
  workingBody: "",
  variableValues: {},
  isStaging: false,
  pendingInsert: null,
  selectedTerminalSessionId: null,

  stagePrompt: (prompt: Prompt) => {
    const defaults: Record<string, string> = {};
    for (const [name, def] of Object.entries(prompt.meta.variables)) {
      defaults[name] = def.default ?? "";
    }

    const activeProject = useProjectStore.getState().activeProject;
    if (activeProject) {
      for (const [name, value] of Object.entries(activeProject.defaults)) {
        if (name in defaults) {
          defaults[name] = value;
        }
      }
    }

    set({
      stagedPrompt: prompt,
      workingBody: prompt.body,
      variableValues: defaults,
      isStaging: true,
      pendingInsert: null,
    });
  },

  setVariableValue: (name: string, value: string) => {
    const { variableValues } = get();
    set({ variableValues: { ...variableValues, [name]: value } });
  },

  setWorkingBody: (body: string) => {
    set({ workingBody: body });
  },

  insertPromptBody: (body: string) => {
    set({ pendingInsert: body });
  },

  clearPendingInsert: () => {
    set({ pendingInsert: null });
  },

  setSelectedTerminalSessionId: (id: string | null) => {
    set({ selectedTerminalSessionId: id });
  },

  dispatch: async (mode: "clipboard") => {
    const { workingBody, variableValues } = get();
    if (mode === "clipboard") {
      const resolved = await api.resolvePrompt(workingBody, variableValues);
      await api.copyToClipboard(resolved);
    }
  },

  clearStaging: () => {
    set({
      stagedPrompt: null,
      workingBody: "",
      variableValues: {},
      isStaging: false,
      pendingInsert: null,
    });
  },
}));
