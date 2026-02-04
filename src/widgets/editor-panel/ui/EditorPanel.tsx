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
    <div className="flex min-h-[420px] flex-col gap-3 rounded-3xl border border-white/70 bg-gradient-to-b from-white/80 to-white/60 p-5 shadow-[0_18px_46px_rgba(31,25,18,0.1)]">
      <div className="flex justify-end text-xs text-zinc-500">
        선택 길이: {selection.text.length}자
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-inner">
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
  );
}
