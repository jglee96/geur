import { useMemo, useRef, useState } from "react";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { EditorPanel } from "@/widgets/editor-panel";
import { AiPanel } from "@/widgets/ai-panel";
import { Topbar } from "@/widgets/topbar";
import { DEFAULT_DOC } from "@/shared/config";
import { SelectionState, PendingChange } from "@/shared/model";
import { buildDiffHtml, fakeAiRewrite, DiffWidget } from "@/features/ai-diff";
import "../App.css";

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
            setIsAiOpen(true);
            return true;
          },
        },
      ]),
    ];
    if (previewExtension) list.push(previewExtension);
    return list;
  }, [editableExtension, previewExtension]);

  async function handleOpen() {
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
  }

  async function handleSave() {
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
  }

  async function requestChange() {
    if (isBusy || pendingChange) return;
    if (!selection.text || selection.from === selection.to) {
      setStatus("선택된 텍스트가 없어요.");
      return;
    }

    setIsBusy(true);
    setStatus("AI가 수정안을 만들고 있어요...");

    await new Promise((resolve) => setTimeout(resolve, 650));
    const suggestion = fakeAiRewrite(selection.text, userPrompt);

    setPendingChange({
      from: selection.from,
      to: selection.to,
      originalText: selection.text,
      suggestedText: suggestion,
    });
    setIsBusy(false);
    setStatus("수정안 준비 완료. 적용하거나 되돌릴 수 있어요.");
  }

  function acceptChange() {
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
  }

  function undoChange() {
    if (!pendingChange) return;
    setPendingChange(null);
    setStatus("수정이 취소되었습니다.");
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3] p-4 font-sans text-zinc-900">
      <Topbar
        filePath={filePath}
        isAiOpen={isAiOpen}
        onOpen={handleOpen}
        onSave={handleSave}
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
      />

      <section
        className={`mt-3 grid gap-4 ${
          isAiOpen ? "grid-cols-1 xl:grid-cols-[1.1fr_0.9fr]" : "grid-cols-1"
        }`}
      >
        <EditorPanel
          docText={docText}
          selection={selection}
          extensions={extensions}
          onEditorReady={(view) => {
            editorRef.current = view;
          }}
          onDocChange={setDocText}
          onSelectionChange={setSelection}
        />

        {isAiOpen ? (
          <AiPanel
            userPrompt={userPrompt}
            pendingChange={pendingChange}
            isBusy={isBusy}
            status={status}
            onUserPromptChange={setUserPrompt}
            onRequestChange={requestChange}
            onAcceptChange={acceptChange}
            onUndoChange={undoChange}
          />
        ) : null}
      </section>
    </main>
  );
}
