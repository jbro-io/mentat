import { EditorView } from "@codemirror/view";

export const mentatTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "#09131B",
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    padding: "16px",
    caretColor: "#04FFA4",
  },
  ".cm-cursor": {
    borderLeftColor: "#04FFA4",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(4, 255, 164, 0.15) !important",
  },
  ".cm-gutters": {
    backgroundColor: "#09131B",
    color: "#3B4F56",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(4, 255, 164, 0.04)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(4, 255, 164, 0.04)",
  },
});
