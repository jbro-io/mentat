import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  dismissing: boolean;
}

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string) => void;
  dismissToast: (id: string) => void;
  startDismiss: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  showToast: (message: string) => {
    const id = String(++nextId);
    set((s) => ({ toasts: [...s.toasts, { id, message, dismissing: false }] }));
    setTimeout(() => {
      get().startDismiss(id);
    }, 2000);
  },

  startDismiss: (id: string) => {
    set((s) => ({
      toasts: s.toasts.map((t) =>
        t.id === id ? { ...t, dismissing: true } : t
      ),
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 150);
  },

  dismissToast: (id: string) => {
    get().startDismiss(id);
  },
}));
