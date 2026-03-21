import type { Hook } from "../../types/claude-config";

interface HooksListProps {
  hooks: Hook[];
}

export function HooksList({ hooks }: HooksListProps) {
  if (hooks.length === 0) {
    return (
      <div className="text-sm text-zinc-600 text-center py-4">
        No hooks configured
      </div>
    );
  }

  // Group hooks by event
  const grouped = hooks.reduce<Record<string, Hook[]>>((acc, hook) => {
    if (!acc[hook.event]) {
      acc[hook.event] = [];
    }
    acc[hook.event].push(hook);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([event, eventHooks]) => (
        <div key={event}>
          <div className="text-xs font-medium text-mentat-accent mb-1.5">
            {event}
          </div>
          <div className="space-y-1">
            {eventHooks.map((hook, i) => (
              <div
                key={`${event}-${i}`}
                className="bg-mentat-bg rounded px-3 py-2 border border-mentat-border"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-mentat-bg-surface text-zinc-400 uppercase">
                    {hook.hook_type}
                  </span>
                  <span className="text-xs text-zinc-500">
                    matcher: <span className="text-zinc-400">{hook.matcher}</span>
                  </span>
                </div>
                <div className="font-mono text-xs text-zinc-300 break-all whitespace-pre-wrap">
                  {hook.command}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
