import { useCallback, useMemo, useRef, useState } from "react";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { EditorPanel } from "@/widgets/editor-panel";
import { AiPanel } from "@/widgets/ai-panel";
import { Topbar } from "@/widgets/topbar";
import { DEFAULT_DOC, MODEL_OPTIONS } from "@/shared/config";
import { SelectionState, PendingChange } from "@/shared/model";
import { buildDiffHtml, DiffWidget } from "@/features/ai-diff";

const DEFAULT_SELECTION: SelectionState = { from: 0, to: 0, text: "" };

export function App() {
  const editorRef = useRef<EditorView | null>(null);
  const [docText, setDocText] = useState(DEFAULT_DOC);
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [userPrompt, setUserPrompt] = useState("더 명확하고 간결하게 다듬어줘.");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("준비됨");
  const [filePath, setFilePath] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [modelId, setModelId] = useState(MODEL_OPTIONS[0]?.id ?? "gpt-4o-mini");

  const handleToggleAi = useCallback(() => {
    setIsAiOpen((prev) => !prev);
  }, []);

  const handleToggleLeft = useCallback(() => {
    setIsLeftOpen((prev) => !prev);
  }, []);

  const previewExtension = useMemo(() => {
    if (!pendingChange) return null;
    const diffHtml = buildDiffHtml(
      pendingChange.originalText,
      pendingChange.suggestedText,
    );
    const decoration = Decoration.replace({
      widget: new DiffWidget(diffHtml),
      inclusive: false,
    });
    return EditorView.decorations.of(
      Decoration.set([decoration.range(pendingChange.from, pendingChange.to)]),
    );
  }, [pendingChange]);

  const editableExtension = useMemo(
    () => EditorView.editable.of(!pendingChange && !isBusy),
    [pendingChange, isBusy],
  );

  const extensions = useMemo(() => {
    const list = [
      markdown(),
      editableExtension,
      keymap.of([
        {
          key: "Mod-l",
          run: () => {
            handleToggleAi();
            return true;
          },
        },
      ]),
    ];
    if (previewExtension) list.push(previewExtension);
    return list;
  }, [editableExtension, handleToggleAi, previewExtension]);

  const handleOpen = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) return;
      const content = await readTextFile(path);
      setDocText(content);
      setFilePath(path);
      setStatus(`열기 완료: ${path}`);
    } catch (error) {
      setStatus("파일 열기에 실패했어요.");
      console.error(error);
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      let path = filePath;
      if (!path) {
        path = await save({
          defaultPath: "untitled.md",
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
      }
      if (!path) return;
      await writeTextFile(path, docText);
      setFilePath(path);
      setStatus(`저장 완료: ${path}`);
    } catch (error) {
      setStatus("파일 저장에 실패했어요.");
      console.error(error);
    }
  }, [docText, filePath]);

  const requestChange = useCallback(async () => {
    if (isBusy || pendingChange) return;
    if (!selection.text || selection.from === selection.to) {
      setStatus("선택된 텍스트가 없어요.");
      return;
    }

    setIsBusy(true);
    setStatus("AI가 수정안을 만들고 있어요...");

    try {
      const suggestion = await invoke<string>("rewrite_text", {
        model: modelId,
        prompt: userPrompt,
        selectedText: selection.text,
      });

      setPendingChange({
        from: selection.from,
        to: selection.to,
        originalText: selection.text,
        suggestedText: suggestion,
      });
      setStatus("수정안 준비 완료. 적용하거나 되돌릴 수 있어요.");
    } catch (error) {
      console.error(error);
      setStatus("AI 요청에 실패했어요. 키 설정을 확인해 주세요.");
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, modelId, pendingChange, selection, userPrompt]);

  const acceptChange = useCallback(() => {
    if (!pendingChange) return;
    if (editorRef.current) {
      editorRef.current.dispatch({
        changes: {
          from: pendingChange.from,
          to: pendingChange.to,
          insert: pendingChange.suggestedText,
        },
      });
    } else {
      setDocText((prev) =>
        prev.slice(0, pendingChange.from) +
        pendingChange.suggestedText +
        prev.slice(pendingChange.to),
      );
    }
    setPendingChange(null);
    setStatus("수정이 적용되었습니다.");
  }, [pendingChange]);

  const undoChange = useCallback(() => {
    if (!pendingChange) return;
    setPendingChange(null);
    setStatus("수정이 취소되었습니다.");
  }, [pendingChange]);

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
  }, []);

  const handleDocChange = useCallback((value: string) => {
    setDocText(value);
  }, []);

  const handleSelectionChange = useCallback((nextSelection: SelectionState) => {
    setSelection(nextSelection);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <Topbar
        filePath={filePath}
        isAiOpen={isAiOpen}
        isLeftOpen={isLeftOpen}
        onOpen={handleOpen}
        onSave={handleSave}
        onToggleAi={handleToggleAi}
        onToggleLeft={handleToggleLeft}
      />

      <main className="grid flex-1 grid-cols-[auto_minmax(0,1fr)_auto] gap-4 px-5 py-6 max-xl:grid-cols-1">
        <aside
          className={`${
            isLeftOpen
              ? "w-64 border border-zinc-200 bg-white px-4 py-4 opacity-100 max-xl:w-full"
              : "w-0 border-0 px-0 opacity-0 max-xl:hidden"
          } rounded-xl transition-[width,opacity,transform] duration-200 ease-in-out`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            로컬 폴더
          </div>
          <div className="mt-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            파일 트리는 다음 단계에서 연결할게요.
          </div>
        </aside>

        <section className="flex min-w-0 justify-center">
          <EditorPanel
            docText={docText}
            selection={selection}
            extensions={extensions}
            pendingChange={pendingChange}
            onAcceptChange={acceptChange}
            onUndoChange={undoChange}
            onEditorReady={handleEditorReady}
            onDocChange={handleDocChange}
            onSelectionChange={handleSelectionChange}
          />
        </section>

        <aside
          className={`${
            isAiOpen
              ? "w-72 border border-zinc-200 bg-white px-4 py-4 opacity-100 max-xl:w-full"
              : "w-0 border-0 px-0 opacity-0 max-xl:hidden"
          } rounded-xl transition-[width,opacity,transform] duration-200 ease-in-out`}
        >
          {isAiOpen ? (
            <AiPanel
              userPrompt={userPrompt}
              modelId={modelId}
              modelOptions={MODEL_OPTIONS}
              pendingChange={pendingChange}
              isBusy={isBusy}
              status={status}
              onModelChange={setModelId}
              onUserPromptChange={setUserPrompt}
              onRequestChange={requestChange}
              onAcceptChange={acceptChange}
              onUndoChange={undoChange}
            />
          ) : (
            <div className="px-2 py-2 text-xs text-zinc-400">
              AI 패널 닫힘
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
