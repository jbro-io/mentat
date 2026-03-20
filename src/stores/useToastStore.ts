import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string) => void;
  dismissToast: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  showToast: (message: string) => {
    const id = String(++nextId);
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2000);
  },

  dismissToast: (id: string) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
