import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { ViewUpdate, EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { PendingChange, SelectionState } from "@/shared/model";
import { Button } from "@/shared/ui";

type EditorPanelProps = {
  docText: string;
  docExternalVersion: number;
  selection: SelectionState;
  extensions: Extension[];
  lastDraftUpdatedAt: number | null;
  pendingChange: PendingChange | null;
  onAcceptChange: () => void;
  onUndoChange: () => void;
  onEditorReady: (view: EditorView) => void;
  onDocChange: (value: string) => void;
  onDocSnapshot: (value: string) => void;
  onSelectionChange: (selection: SelectionState) => void;
  onEmergencyCopy: () => void;
  onEmergencySave: () => void;
};

export const EditorPanel = memo(function EditorPanel({
  docText,
  docExternalVersion,
  selection,
  extensions,
  lastDraftUpdatedAt,
  pendingChange,
  onAcceptChange,
  onUndoChange,
  onEditorReady,
  onDocChange,
  onDocSnapshot,
  onSelectionChange,
  onEmergencyCopy,
  onEmergencySave,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectionRafRef = useRef<number | null>(null);
  const selectionThrottleRef = useRef<number>(0);
  const pendingSelectionRef = useRef<SelectionState | null>(null);
  const lastSelectionRef = useRef<{ from: number; to: number }>({
    from: 0,
    to: 0,
  });
  const snapshotTimeoutRef = useRef<number | null>(null);
  const initialDocRef = useRef(docText);
  const isApplyingExternalDocRef = useRef(false);
  const hasBootstrappedDocRef = useRef(false);
  const lastAppliedExternalVersionRef = useRef(0);
  const [view, setView] = useState<EditorView | null>(null);
  const basicSetup = useMemo(
    () => ({
      lineNumbers: false,
      foldGutter: false,
      highlightActiveLine: false,
      highlightActiveLineGutter: false,
    }),
    [],
  );
  const [floatingStyle, setFloatingStyle] = useState<{
    left: number;
    top: number;
    visible: boolean;
  }>({ left: 0, top: 0, visible: false });
  const deferredDocText = useDeferredValue(docText);
  const deferredSelection = useDeferredValue(selection);
  const wordCount = useMemo(() => {
    const words = deferredDocText
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return words.length;
  }, [deferredDocText]);
  const selectedCount = useMemo(
    () => Math.max(0, deferredSelection.to - deferredSelection.from),
    [deferredSelection.from, deferredSelection.to],
  );

  useEffect(() => {
    if (!pendingChange || !view || !containerRef.current) {
      setFloatingStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    let frameId = 0;
    let frameId2 = 0;

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
        const rawTop = widgetRect.bottom - containerRect.top + 8;
        const rawLeft = widgetRect.left - containerRect.left;
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

    // Wait for widget layout and then keep position synced while scrolling.
    frameId = requestAnimationFrame(placeBelowDiff);
    frameId2 = requestAnimationFrame(() => requestAnimationFrame(placeBelowDiff));
    const timeoutId = window.setTimeout(placeBelowDiff, 80);

    const scroller = containerRef.current.querySelector(".cm-scroller");
    const onScroll = () => placeBelowDiff();
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(frameId2);
      window.clearTimeout(timeoutId);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [pendingChange, view]);

  const handleCreateEditor = useCallback(
    (nextView: EditorView) => {
      if (!hasBootstrappedDocRef.current && initialDocRef.current.length > 0) {
        nextView.dispatch({
          changes: {
            from: 0,
            to: nextView.state.doc.length,
            insert: initialDocRef.current,
          },
        });
      }
      hasBootstrappedDocRef.current = true;
      onEditorReady(nextView);
      setView(nextView);
    },
    [onEditorReady],
  );

  const handleUpdate = useCallback(
    (update: ViewUpdate) => {
      if (update.docChanged && !isApplyingExternalDocRef.current) {
        const nextDoc = update.state.doc.toString();
        onDocChange(nextDoc);
        if (snapshotTimeoutRef.current !== null) {
          window.clearTimeout(snapshotTimeoutRef.current);
        }
        snapshotTimeoutRef.current = window.setTimeout(() => {
          onDocSnapshot(nextDoc);
          snapshotTimeoutRef.current = null;
        }, 700);
      }

      const isComposing = update.view.composing;
      if (update.selectionSet) {
        if (isComposing) {
          return;
        }
        const { from, to } = update.state.selection.main;
        if (
          from === lastSelectionRef.current.from &&
          to === lastSelectionRef.current.to
        ) {
          return;
        }
        lastSelectionRef.current = { from, to };
        pendingSelectionRef.current = { from, to, text: "" };
        const now = performance.now();
        if (now - selectionThrottleRef.current < 50) {
          return;
        }
        selectionThrottleRef.current = now;
        if (selectionRafRef.current !== null) {
          cancelAnimationFrame(selectionRafRef.current);
        }
        selectionRafRef.current = requestAnimationFrame(() => {
          if (pendingSelectionRef.current) {
            onSelectionChange(pendingSelectionRef.current);
          }
          selectionRafRef.current = null;
        });
      }
    },
    [onDocChange, onDocSnapshot, onSelectionChange],
  );

  useEffect(() => {
    if (!view) return;
    if (docExternalVersion === lastAppliedExternalVersionRef.current) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === docText) {
      lastAppliedExternalVersionRef.current = docExternalVersion;
      return;
    }

    isApplyingExternalDocRef.current = true;
    const anchor = Math.min(view.state.selection.main.anchor, docText.length);
    const head = Math.min(view.state.selection.main.head, docText.length);
    view.dispatch({
      changes: {
        from: 0,
        to: currentDoc.length,
        insert: docText,
      },
      selection: {
        anchor,
        head,
      },
    });
    isApplyingExternalDocRef.current = false;
    lastAppliedExternalVersionRef.current = docExternalVersion;
  }, [docExternalVersion, docText, view]);

  useEffect(() => {
    return () => {
      if (selectionRafRef.current !== null) {
        cancelAnimationFrame(selectionRafRef.current);
      }
      if (snapshotTimeoutRef.current !== null) {
        window.clearTimeout(snapshotTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex w-full max-w-[1080px] flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="rounded-md bg-muted px-2 py-1">
          선택 후 `Ctrl/Cmd + L` 또는 오른쪽에서 AI 요청
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
            onClick={onEmergencyCopy}
          >
            긴급 복사
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
            onClick={onEmergencySave}
          >
            긴급 저장
          </button>
          <span>
            자동저장{" "}
            {lastDraftUpdatedAt
              ? new Date(lastDraftUpdatedAt).toLocaleTimeString("ko-KR")
              : "-"}
          </span>
          <span>단어 {wordCount}</span>
          <span>선택 {selectedCount}자</span>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[760px] px-1 py-4 sm:px-3 sm:py-6">
        <div ref={containerRef} className="relative">
          <div className="min-h-[74vh]">
            <CodeMirror
              height="100%"
              className="h-full"
              basicSetup={basicSetup}
              extensions={extensions}
              {...(!hasBootstrappedDocRef.current
                ? { value: initialDocRef.current }
                : {})}
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
