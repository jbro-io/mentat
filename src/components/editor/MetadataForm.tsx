import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import type { Prompt, PromptType } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import {
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Checkbox,
  Button,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui";

interface Props {
  prompt: Prompt;
}

const PROMPT_TYPES: PromptType[] = ["system-prompt", "skill", "template", "snippet"];
const TARGET_OPTIONS = ["claude", "openai"];

const TITLE_DEBOUNCE_MS = 400;

export function MetadataForm({ prompt }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [tagInput, setTagInput] = useState("");
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
    (value: string) => {
      updateMeta({ type: value as PromptType });
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


  return (
    <div className="border-b border-mentat-border">
      <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span>Metadata</span>
            <span className="text-[10px]">{collapsed ? "+" : "-"}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-3 text-xs">
            {/* Title */}
            <div>
              <Label>Title</Label>
              <Input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
              />
            </div>

            {/* Type + Version row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={prompt.meta.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Version</Label>
                <p className="text-zinc-300 py-1">{prompt.meta.version}</p>
              </div>
            </div>

            {/* Target */}
            <div>
              <Label>Target</Label>
              <div className="flex gap-3">
                {TARGET_OPTIONS.map((t) => (
                  <Label
                    key={t}
                    className="flex items-center gap-1.5 text-sm text-zinc-300 cursor-pointer"
                  >
                    <Checkbox
                      checked={prompt.meta.target.includes(t)}
                      onCheckedChange={() => handleTargetToggle(t)}
                    />
                    {t}
                  </Label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {prompt.meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-mentat-bg-raised rounded-full text-zinc-400"
                  >
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTag(tag)}
                      className="p-0 text-zinc-600 hover:text-zinc-300"
                    >
                      x
                    </Button>
                  </span>
                ))}
              </div>
              <Input
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
              />
            </div>

          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
