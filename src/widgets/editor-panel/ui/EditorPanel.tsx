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
    <div className="flex min-h-[420px] flex-col gap-2 bg-zinc-100 p-4">
      <div className="flex justify-end text-xs text-zinc-500">
        선택 길이: {selection.text.length}자
      </div>
      <div className="flex-1 overflow-auto bg-zinc-100">
        <div className="mx-auto min-h-full w-full max-w-[900px] border border-zinc-200 bg-white">
          <CodeMirror
            value={docText}
            height="100%"
            className="h-full"
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
      </div>
    </div>
  );
}
