import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { ViewUpdate, EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { PendingChange, SelectionState } from "@/shared/model";
import { Button } from "@/shared/ui";

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
  const wordCount = useMemo(() => {
    const words = docText
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return words.length;
  }, [docText]);

  useEffect(() => {
    if (!pendingChange || !view || !containerRef.current) {
      setFloatingStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    let frameId = 0;

    const placeBelowDiff = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const diffWidgets = containerRef.current.querySelectorAll(
        "[data-ai-diff-widget='true']",
      ) as NodeListOf<HTMLElement>;
      const diffWidget =
        diffWidgets.length > 0 ? diffWidgets[diffWidgets.length - 1] : null;

      if (diffWidget) {
        const widgetRect = diffWidget.getBoundingClientRect();
        const rawTop = widgetRect.top - containerRect.top + widgetRect.height + 8;
        const rawLeft = widgetRect.right - containerRect.left - 168;
        const maxLeft = containerRect.width - 176;
        setFloatingStyle({
          left: Math.max(8, Math.min(rawLeft, maxLeft)),
          top: Math.max(8, rawTop),
          visible: true,
        });
        return;
      }

      const coords = view.coordsAtPos(pendingChange.to);
      if (!coords) {
        setFloatingStyle((prev) => ({ ...prev, visible: false }));
        return;
      }
      const rawLeft = coords.left - containerRect.left;
      const rawTop = coords.bottom - containerRect.top + 8;
      const maxLeft = containerRect.width - 176;
      setFloatingStyle({
        left: Math.max(8, Math.min(rawLeft, maxLeft)),
        top: Math.max(8, rawTop),
        visible: true,
      });
    };

    // Wait one frame so CodeMirror widget layout is finalized.
    frameId = requestAnimationFrame(placeBelowDiff);
    const timeoutId = window.setTimeout(placeBelowDiff, 40);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
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
    <div className="flex w-full max-w-[1080px] flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="rounded-md bg-muted px-2 py-1">
          선택 후 `Ctrl/Cmd + L` 또는 오른쪽에서 AI 요청
        </div>
        <div className="flex items-center gap-3">
          <span>단어 {wordCount}</span>
          <span>선택 {selection.text.length}자</span>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[760px] px-1 py-4 sm:px-3 sm:py-6">
        <div ref={containerRef} className="relative">
          <div className="min-h-[74vh]">
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
              className="absolute z-10 flex items-center gap-2 rounded-xl border border-border bg-popover/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-[0_8px_20px_rgba(0,0,0,0.14)] backdrop-blur"
              style={{ left: floatingStyle.left, top: floatingStyle.top }}
            >
              <span>AI 변경</span>
              <Button type="button" size="sm" onClick={onAcceptChange}>
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
      </div>
    </div>
  );
});
