import { useToastStore } from "../../stores/useToastStore";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-mentat-bg-raised border border-mentat-border text-zinc-200 text-sm px-4 py-2 rounded-lg shadow-xl flex items-center gap-3"
          style={{
            animation: `${toast.dismissing ? 'slideDown' : 'slideUp'} 150ms cubic-bezier(0.16, 1, 0.3, 1) both`,
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
