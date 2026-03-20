import { EditorView } from "@codemirror/view";

export const mentatTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "#09090b",
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    padding: "16px",
    caretColor: "#818cf8",
  },
  ".cm-cursor": {
    borderLeftColor: "#818cf8",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(99, 102, 241, 0.2) !important",
  },
  ".cm-gutters": {
    backgroundColor: "#09090b",
    color: "#3f3f46",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
});
