import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { ViewUpdate, EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { PendingChange, SelectionState } from "@/shared/model";
import { Button, Card, CardContent, CardHeader } from "@/shared/ui";

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

export const EditorPanel = memo(function EditorPanel({
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
  const basicSetup = useMemo(
    () => ({ lineNumbers: false, foldGutter: false }),
    [],
  );
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
  }, [pendingChange, view]);

  const handleCreateEditor = useCallback(
    (nextView: EditorView) => {
      onEditorReady(nextView);
      setView(nextView);
    },
    [onEditorReady],
  );

  const handleUpdate = useCallback(
    (update: ViewUpdate) => {
      if (update.docChanged) {
        onDocChange(update.state.doc.toString());
      }
      if (update.selectionSet) {
        const { from, to } = update.state.selection.main;
        const selectedText =
          from === to ? "" : update.state.sliceDoc(from, to);
        onSelectionChange({ from, to, text: selectedText });
      }
    },
    [onDocChange, onSelectionChange],
  );

  return (
    <div className="flex w-full max-w-[900px] flex-col gap-2">
      <div className="text-right text-xs text-muted-foreground">
        선택 길이: {selection.text.length}자
      </div>
      <Card>
        <CardHeader className="py-2 text-xs text-muted-foreground">
          문서
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="relative">
            <div className="min-h-[65vh] bg-background">
              <CodeMirror
                value={docText}
                height="100%"
                className="h-full"
                basicSetup={basicSetup}
                extensions={extensions}
                onCreateEditor={handleCreateEditor}
                onUpdate={handleUpdate}
              />
            </div>
            {pendingChange && floatingStyle.visible ? (
              <div
                className="absolute z-10 flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground shadow-sm"
                style={{ left: floatingStyle.left, top: floatingStyle.top }}
              >
                <span>AI 변경</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={onAcceptChange}
                >
                  Keep
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onUndoChange}
                >
                  Undo
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
