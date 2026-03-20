import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { variableHighlight } from "../../lib/codemirror/variableHighlight";
import { mentatTheme } from "../../lib/codemirror/theme";
import { useStagingStore } from "../../stores/useStagingStore";
import { useUIStore } from "../../stores/useUIStore";
import { NeovimEditor } from "../editor/NeovimEditor";
import { StagingToolbar } from "./StagingToolbar";
import { VariableForm } from "./VariableForm";

export function StagingPanel() {
  const stagedPrompt = useStagingStore((s) => s.stagedPrompt);
  const workingBody = useStagingStore((s) => s.workingBody);
  const setWorkingBody = useStagingStore((s) => s.setWorkingBody);
  const editorPreference = useUIStore((s) => s.editorPreference);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpdate = useCallback(
    (body: string) => {
      setWorkingBody(body);
    },
    [setWorkingBody],
  );

  useEffect(() => {
    if (!containerRef.current || editorPreference === "neovim") return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handleUpdate(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: workingBody,
      extensions: [
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

    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedPrompt?.meta.id, handleUpdate, editorPreference]);

  if (!stagedPrompt) return null;

  const hasVariables = Object.keys(stagedPrompt.meta.variables).length > 0;

  return (
    <div className="h-full flex flex-col bg-mentat-bg">
      <StagingToolbar />
      {hasVariables && <VariableForm prompt={stagedPrompt} />}
      <div className="flex-1 overflow-hidden">
        {editorPreference === "neovim" ? (
          <NeovimEditor
            initialBody={workingBody}
            onSave={handleUpdate}
          />
        ) : (
          <div ref={containerRef} className="h-full overflow-auto" />
        )}
      </div>
    </div>
  );
}
