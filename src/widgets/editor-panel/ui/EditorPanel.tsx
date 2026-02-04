import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { ViewUpdate, EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { SelectionState } from "@/shared/model";

type EditorPanelProps = {
  docText: string;
  selection: SelectionState;
  extensions: Extension[];
  onEditorReady: (view: EditorView) => void;
  onDocChange: (value: string) => void;
  onSelectionChange: (selection: SelectionState) => void;
};

export function EditorPanel({
  docText,
  selection,
  extensions,
  onEditorReady,
  onDocChange,
  onSelectionChange,
}: EditorPanelProps) {
  return (
    <div className="editor-panel">
      <div className="editor-toolbar minimal">
        <div className="toolbar-meta">선택 길이: {selection.text.length}자</div>
      </div>
      <CodeMirror
        value={docText}
        height="100%"
        basicSetup={{ lineNumbers: false, foldGutter: false }}
        extensions={extensions}
        onCreateEditor={(view) => {
          onEditorReady(view);
        }}
        onUpdate={(update: ViewUpdate) => {
          if (update.docChanged) {
            onDocChange(update.state.doc.toString());
          }
          if (update.selectionSet) {
            const { from, to } = update.state.selection.main;
            const selectedText =
              from === to ? "" : update.state.sliceDoc(from, to);
            onSelectionChange({ from, to, text: selectedText });
          }
        }}
      />
    </div>
  );
}
