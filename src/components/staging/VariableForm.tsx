import type { Prompt } from "../../types/prompt";
import { useStagingStore } from "../../stores/useStagingStore";
import { Input, Label, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui";

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
            <Label>
              {name}
              {def.description && (
                <span className="ml-1 text-zinc-500 font-normal">
                  — {def.description}
                </span>
              )}
            </Label>
            {def.options ? (
              <Select
                value={variableValues[name] ?? ""}
                onValueChange={(value) => setVariableValue(name, value)}
              >
                <SelectTrigger className="text-xs px-2 py-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {def.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                value={variableValues[name] ?? ""}
                onChange={(e) => setVariableValue(name, e.target.value)}
                placeholder={def.default ?? `Enter ${name}...`}
                className="text-xs px-2 py-1.5"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
