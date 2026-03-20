import { EditorView, ViewPlugin, Decoration, type DecorationSet, type ViewUpdate, MatchDecorator } from "@codemirror/view";

const variableMatcher = new MatchDecorator({
  regexp: /\{\{(\w+)\}\}/g,
  decoration: () =>
    Decoration.mark({
      class: "cm-variable-placeholder",
    }),
});

const variableTheme = EditorView.baseTheme({
  ".cm-variable-placeholder": {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8",
    borderRadius: "3px",
    padding: "0 2px",
  },
});

export const variableHighlight = [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: Parameters<typeof variableMatcher.createDeco>[0]) {
        this.decorations = variableMatcher.createDeco(view);
      }
      update(update: ViewUpdate) {
        this.decorations = variableMatcher.updateDeco(update, this.decorations);
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  ),
  variableTheme,
];
