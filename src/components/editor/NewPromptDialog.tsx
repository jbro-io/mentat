import { useState, useCallback, useEffect, useRef } from "react";
import type { PromptType } from "../../types/prompt";
import { usePromptStore } from "../../stores/usePromptStore";
import * as api from "../../lib/tauri";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-[480px] bg-mentat-bg border border-mentat-border rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-mentat-border">
          <h2 className="text-sm font-medium text-zinc-200">New Prompt</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Title</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
              placeholder="My Prompt"
              className="w-full bg-mentat-bg-raised border border-mentat-border rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PromptType)}
              className="w-full bg-mentat-bg-raised border border-mentat-border rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent"
            >
              {PROMPT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>

          {/* Target */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Target</label>
            <div className="flex gap-3">
              {TARGET_OPTIONS.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-1.5 text-sm text-zinc-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={targets.includes(t)}
                    onChange={() => toggleTarget(t)}
                    className="rounded border-zinc-600 bg-mentat-bg-raised text-mentat-accent focus:ring-mentat-accent focus:ring-offset-0"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-mentat-bg-raised text-zinc-400 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
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
                if (e.key === "Escape") onClose();
              }}
              placeholder="Add tag and press Enter"
              className="w-full bg-mentat-bg-raised border border-mentat-border rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-mentat-border bg-mentat-bg">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-mentat-bg-raised text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="text-xs px-3 py-1.5 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
