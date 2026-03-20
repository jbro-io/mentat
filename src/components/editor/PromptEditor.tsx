import { useEffect, useRef, useState, useCallback } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import type { Prompt } from "../../types/prompt";
import { variableHighlight } from "../../lib/codemirror/variableHighlight";
import { mentatTheme } from "../../lib/codemirror/theme";
import { usePromptStore } from "../../stores/usePromptStore";
import { useUIStore } from "../../stores/useUIStore";

interface Props {
  prompt: Prompt;
}

export function PromptEditor({ prompt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const promptRef = useRef<Prompt>(prompt);
  const updatePrompt = usePromptStore((s) => s.updatePrompt);
  const editorFocusRequested = useUIStore((s) => s.editorFocusRequested);
  const [isDirty, setIsDirty] = useState(false);
  const savedBodyRef = useRef(prompt.body);

  // Keep the ref current so the save keymap always sees the latest prompt
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  // Focus the editor when requested (e.g. ArrowRight from prompt list)
  useEffect(() => {
    if (editorFocusRequested > 0 && viewRef.current) {
      viewRef.current.focus();
    }
  }, [editorFocusRequested]);

  const handleSave = useCallback(
    (view: EditorView) => {
      const body = view.state.doc.toString();
      const current = promptRef.current;
      updatePrompt({ ...current, body });
      savedBodyRef.current = body;
      setIsDirty(false);
      return true;
    },
    [updatePrompt]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: (view) => handleSave(view),
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const currentBody = update.state.doc.toString();
        setIsDirty(currentBody !== savedBodyRef.current);
      }
    });

    const state = EditorState.create({
      doc: prompt.body,
      extensions: [
        saveKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        history(),
        markdown(),
        variableHighlight,
        mentatTheme,
        EditorView.lineWrapping,
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    savedBodyRef.current = prompt.body;
    setIsDirty(false);
    view.focus();

    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt.meta.id, handleSave]);

  return (
    <div className="h-full flex flex-col">
      {isDirty && (
        <div className="flex items-center px-4 py-1 bg-amber-900/20 border-b border-amber-800/30">
          <span className="text-[11px] text-amber-400 font-medium">Unsaved changes</span>
          <span className="text-[10px] text-zinc-500 ml-2">Cmd+S to save</span>
        </div>
      )}
      <div ref={containerRef} className="flex-1 overflow-auto" />
    </div>
  );
}
