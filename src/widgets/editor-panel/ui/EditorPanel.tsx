import React, { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { ViewUpdate, EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { PendingChange, SelectionState } from "@/shared/model";

type EditorPanelProps = {
  docText: string;
  selection: SelectionState;
  extensions: Extension[];
  pendingChange: PendingChange | null;
  onAcceptChange: () => void;
  onUndoChange: () => void;
  onEditorReady: (view: EditorView) => void;
  onDocChange: (value: string) => void;
  onSelectionChange: (selection: SelectionState) => void;
};

export function EditorPanel({
  docText,
  selection,
  extensions,
  pendingChange,
  onAcceptChange,
  onUndoChange,
  onEditorReady,
  onDocChange,
  onSelectionChange,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<EditorView | null>(null);
  const [floatingStyle, setFloatingStyle] = useState<{
    left: number;
    top: number;
    visible: boolean;
  }>({ left: 0, top: 0, visible: false });

  useEffect(() => {
    if (!pendingChange || !view || !containerRef.current) {
      setFloatingStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    const coords = view.coordsAtPos(pendingChange.to);
    const containerRect = containerRef.current.getBoundingClientRect();
    if (!coords) {
      setFloatingStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    const rawLeft = coords.left - containerRect.left;
    const rawTop = coords.bottom - containerRect.top + 6;
    const maxLeft = containerRect.width - 180;
    setFloatingStyle({
      left: Math.max(8, Math.min(rawLeft, maxLeft)),
      top: Math.max(8, rawTop),
      visible: true,
    });
  }, [pendingChange, view, selection]);

  return (
    <div className="flex min-h-[420px] flex-col gap-2 bg-zinc-100 p-4">
      <div className="flex justify-end text-xs text-zinc-500">
        선택 길이: {selection.text.length}자
      </div>
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-zinc-100"
      >
        <div className="mx-auto min-h-full w-full max-w-[900px] border border-zinc-200 bg-white">
          <CodeMirror
            value={docText}
            height="100%"
            className="h-full"
            basicSetup={{ lineNumbers: false, foldGutter: false }}
            extensions={extensions}
            onCreateEditor={(view) => {
              onEditorReady(view);
              setView(view);
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
        {pendingChange && floatingStyle.visible ? (
          <div
            className="absolute z-10 flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1 text-xs shadow-sm"
            style={{ left: floatingStyle.left, top: floatingStyle.top }}
          >
            <span className="text-zinc-500">AI 변경</span>
            <button
              type="button"
              className="rounded border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              onClick={onAcceptChange}
            >
              Keep
            </button>
            <button
              type="button"
              className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-400"
              onClick={onUndoChange}
            >
              Undo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
