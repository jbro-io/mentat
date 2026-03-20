import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import type { Prompt, PromptType, VariableDefinition } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";

interface Props {
  prompt: Prompt;
}

const PROMPT_TYPES: PromptType[] = ["system-prompt", "skill", "template", "snippet"];
const TARGET_OPTIONS = ["claude", "openai"];

const TITLE_DEBOUNCE_MS = 400;

export function MetadataForm({ prompt }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [newVarName, setNewVarName] = useState("");
  const [newVarDesc, setNewVarDesc] = useState("");
  const [localTitle, setLocalTitle] = useState(prompt.meta.title);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatePrompt = usePromptStore((s) => s.updatePrompt);

  // Sync local title when prompt changes externally (e.g. switching prompts)
  useEffect(() => {
    setLocalTitle(prompt.meta.title);
  }, [prompt.meta.id, prompt.meta.title]);

  // Clean up debounce timer on unmount to prevent firing after component is gone
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  }, []);

  const updateMeta = useCallback(
    (patch: Partial<Prompt["meta"]>) => {
      updatePrompt({
        ...prompt,
        meta: { ...prompt.meta, ...patch },
      });
    },
    [prompt, updatePrompt]
  );

  const handleTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setLocalTitle(newTitle);
      // Debounce the save to avoid writing to disk on every keystroke
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = setTimeout(() => {
        updateMeta({ title: newTitle });
      }, TITLE_DEBOUNCE_MS);
    },
    [updateMeta]
  );

  const handleTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      updateMeta({ type: e.target.value as PromptType });
    },
    [updateMeta]
  );

  const handleTargetToggle = useCallback(
    (target: string) => {
      const current = prompt.meta.target;
      const next = current.includes(target)
        ? current.filter((t) => t !== target)
        : [...current, target];
      updateMeta({ target: next });
    },
    [prompt.meta.target, updateMeta]
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !prompt.meta.tags.includes(trimmed)) {
      updateMeta({ tags: [...prompt.meta.tags, trimmed] });
    }
    setTagInput("");
  }, [tagInput, prompt.meta.tags, updateMeta]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      updateMeta({ tags: prompt.meta.tags.filter((t) => t !== tag) });
    },
    [prompt.meta.tags, updateMeta]
  );

  const handleAddVariable = useCallback(() => {
    const name = newVarName.trim();
    if (!name || prompt.meta.variables[name]) return;
    const newVar: VariableDefinition = {};
    if (newVarDesc.trim()) newVar.description = newVarDesc.trim();
    updateMeta({
      variables: { ...prompt.meta.variables, [name]: newVar },
    });
    setNewVarName("");
    setNewVarDesc("");
  }, [newVarName, newVarDesc, prompt.meta.variables, updateMeta]);

  const handleRemoveVariable = useCallback(
    (name: string) => {
      const next = { ...prompt.meta.variables };
      delete next[name];
      updateMeta({ variables: next });
    },
    [prompt.meta.variables, updateMeta]
  );

  const inputClass =
    "w-full bg-mentat-bg-raised border border-mentat-border rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent transition-colors";

  return (
    <div className="border-b border-mentat-border">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span>Metadata</span>
        <span className="text-[10px]">{collapsed ? "+" : "-"}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-3 space-y-3 text-xs">
          {/* Title */}
          <div>
            <label className="block text-zinc-500 mb-1">Title</label>
            <input
              type="text"
              value={localTitle}
              onChange={handleTitleChange}
              className={inputClass}
            />
          </div>

          {/* Type + Version row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-zinc-500 mb-1">Type</label>
              <select
                value={prompt.meta.type}
                onChange={handleTypeChange}
                className={inputClass}
              >
                {PROMPT_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Version</label>
              <p className="text-zinc-300 py-1">{prompt.meta.version}</p>
            </div>
          </div>

          {/* Target */}
          <div>
            <label className="block text-zinc-500 mb-1">Target</label>
            <div className="flex gap-3">
              {TARGET_OPTIONS.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-1.5 text-sm text-zinc-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={prompt.meta.target.includes(t)}
                    onChange={() => handleTargetToggle(t)}
                    className="rounded border-zinc-600 bg-mentat-bg-raised text-mentat-accent focus:ring-mentat-accent focus:ring-offset-0"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-zinc-500 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {prompt.meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-mentat-bg-raised rounded-full text-zinc-400"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag, press Enter"
              className={inputClass}
            />
          </div>

          {/* Variables */}
          <div>
            <label className="block text-zinc-500 mb-1">Variables</label>
            {Object.keys(prompt.meta.variables).length > 0 && (
              <div className="space-y-1 mb-2">
                {Object.entries(prompt.meta.variables).map(([name, def]) => (
                  <div key={name} className="flex items-center gap-2 group">
                    <code className="text-mentat-accent">{`{{${name}}}`}</code>
                    <span className="text-zinc-600">--</span>
                    <span className="text-zinc-400 flex-1 truncate">
                      {def.description || "no description"}
                    </span>
                    {def.default && (
                      <span className="text-zinc-600">(default: {def.default})</span>
                    )}
                    <button
                      onClick={() => handleRemoveVariable(name)}
                      className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="name"
                className={`${inputClass} flex-1`}
              />
              <input
                type="text"
                value={newVarDesc}
                onChange={(e) => setNewVarDesc(e.target.value)}
                placeholder="description"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddVariable();
                  }
                }}
                className={`${inputClass} flex-1`}
              />
              <button
                onClick={handleAddVariable}
                disabled={!newVarName.trim()}
                className="px-2 py-1 rounded bg-mentat-bg-raised text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
