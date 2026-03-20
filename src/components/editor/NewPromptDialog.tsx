import { useState, useCallback, useEffect, useRef } from "react";
import type { PromptType } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import * as api from "../../lib/tauri";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Checkbox,
  Button,
} from "../ui";

const PROMPT_TYPES: PromptType[] = ["system-prompt", "skill", "template", "snippet"];
const TARGET_OPTIONS = ["claude", "openai"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewPromptDialog({ open, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PromptType>("system-prompt");
  const [targets, setTargets] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const fetchPrompts = usePromptStore((s) => s.fetchPrompts);
  const fetchTags = usePromptStore((s) => s.fetchTags);
  const fetchFolders = usePromptStore((s) => s.fetchFolders);
  const selectPrompt = usePromptStore((s) => s.selectPrompt);

  useEffect(() => {
    if (open) {
      setTitle("");
      setType("system-prompt");
      setTargets([]);
      setTagInput("");
      setTags([]);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  const toggleTarget = useCallback((t: string) => {
    setTargets((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await api.createNewPrompt(
        title.trim(),
        type,
        undefined,
        tags.length > 0 ? tags : undefined,
        targets.length > 0 ? targets : undefined,
      );

      await fetchPrompts();
      await fetchTags();
      await fetchFolders();
      await selectPrompt(created.file_path);
      onClose();
    } catch (e) {
      console.error("Failed to create prompt:", e);
    } finally {
      setIsSubmitting(false);
    }
  }, [title, type, targets, tags, isSubmitting, fetchPrompts, fetchTags, fetchFolders, selectPrompt, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Prompt</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <Label>Title</Label>
            <Input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
              placeholder="My Prompt"
            />
          </div>

          {/* Type */}
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PromptType)}>
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
                    checked={targets.includes(t)}
                    onCheckedChange={() => toggleTarget(t)}
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
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-mentat-bg-raised text-zinc-400 rounded-full"
                >
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTag(tag)}
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
                if (e.key === "Escape") onClose();
              }}
              placeholder="Add tag and press Enter"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
