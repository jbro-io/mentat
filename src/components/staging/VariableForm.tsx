import type { Prompt } from "../../types/prompt";
import { useStagingStore } from "../../stores/useStagingStore";

interface Props {
  prompt: Prompt;
}

export function VariableForm({ prompt }: Props) {
  const variableValues = useStagingStore((s) => s.variableValues);
  const setVariableValue = useStagingStore((s) => s.setVariableValue);

  const variables = Object.entries(prompt.meta.variables);
  if (variables.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-mentat-border bg-mentat-bg-raised">
      <h3 className="text-xs font-semibold text-mentat-accent uppercase tracking-wider mb-2">
        Variables
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {variables.map(([name, def]) => (
          <div key={name} className="flex flex-col gap-1">
            <label className="text-xs text-zinc-300 font-medium">
              {name}
              {def.description && (
                <span className="ml-1 text-zinc-500 font-normal">
                  — {def.description}
                </span>
              )}
            </label>
            {def.options ? (
              <select
                value={variableValues[name] ?? ""}
                onChange={(e) => setVariableValue(name, e.target.value)}
                className="text-xs px-2 py-1.5 rounded bg-mentat-bg-raised border border-mentat-border text-zinc-200 focus:border-mentat-accent focus:outline-none transition-colors"
              >
                {def.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={variableValues[name] ?? ""}
                onChange={(e) => setVariableValue(name, e.target.value)}
                placeholder={def.default ?? `Enter ${name}...`}
                className="text-xs px-2 py-1.5 rounded bg-mentat-bg-raised border border-mentat-border text-zinc-200 placeholder-zinc-500 focus:border-mentat-accent focus:outline-none transition-colors"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
