import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { EditorPanel } from "@/widgets/editor-panel";
import { FileTreePanel } from "@/widgets/file-tree";
import { AiPanel } from "@/widgets/ai-panel";
import { Topbar } from "@/widgets/topbar";
import { DEFAULT_DOC, MODEL_OPTIONS } from "@/shared/config";
import { SelectionState, PendingChange } from "@/shared/model";
import { buildDiffHtml, DiffWidget } from "@/features/ai-diff";
import { useFileTree } from "@/features/file-tree";
import { useThemeMode } from "@/features/theme";
import { getDocumentTitle } from "@/entities/document";
import { Toaster, ToastProviderInternal, useToast } from "@/shared/ui";

const DEFAULT_SELECTION: SelectionState = { from: 0, to: 0, text: "" };

function AppContent() {
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
  const [apiKey, setApiKey] = useState("");
  const { themeMode, setThemeMode } = useThemeMode();
  const { push } = useToast();
  const {
    rootPath,
    tree,
    selectedPath,
    openFolder,
    selectPath,
    createFile,
    createFolder,
    renamePath,
    deletePath,
  } = useFileTree({ onStatus: setStatus });

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const docTitle = useMemo(() => {
    return getDocumentTitle(docText, filePath);
  }, [docText, filePath]);

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
      EditorView.lineWrapping,
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
      if (!apiKey) {
        setStatus("API 키가 필요합니다. 상단 설정에서 입력해 주세요.");
        setIsBusy(false);
        return;
      }
      const suggestion = await invoke<string>("rewrite_text", {
        model: modelId,
        prompt: userPrompt,
        selectedText: selection.text,
        apiKey,
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
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : JSON.stringify(error);
      setStatus(`AI 요청 실패: ${message}`);
    } finally {
      setIsBusy(false);
    }
  }, [apiKey, isBusy, modelId, pendingChange, selection, userPrompt]);

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

  const handleSaveApiKey = useCallback((value: string) => {
    setApiKey(value);
    localStorage.setItem("openai_api_key", value);
    setStatus("API 키가 저장되었습니다.");
  }, []);

  const openMarkdownFile = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      const lower = relativePath.toLowerCase();
      if (!lower.endsWith(".md") && !lower.endsWith(".mdx")) {
        push({
          title: "열 수 없는 파일",
          description: "마크다운(.md, .mdx) 파일만 열 수 있어요.",
          variant: "destructive",
        });
        return;
      }
      const fullPath = `${rootPath}/${relativePath}`;
      const content = await readTextFile(fullPath);
      setDocText(content);
      setFilePath(fullPath);
      selectPath(relativePath);
      setStatus(`열기 완료: ${fullPath}`);
    },
    [push, rootPath, selectPath],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Topbar
        docTitle={docTitle}
        filePath={filePath}
        isAiOpen={isAiOpen}
        isLeftOpen={isLeftOpen}
        apiKey={apiKey}
        themeMode={themeMode}
        onOpen={handleOpen}
        onSave={handleSave}
        onToggleAi={handleToggleAi}
        onToggleLeft={handleToggleLeft}
        onSaveApiKey={handleSaveApiKey}
        onThemeModeChange={setThemeMode}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-stretch overflow-hidden max-xl:grid-cols-1 max-xl:overflow-y-auto">
        <aside
          className={`${
            isLeftOpen
              ? "w-72 border-r border-border/80 bg-muted/35 px-2 py-2 opacity-100 backdrop-blur-sm max-xl:w-full"
              : "w-0 border-0 px-0 opacity-0 max-xl:hidden"
          } min-h-0 self-stretch overflow-y-auto transition-[width,opacity,transform] duration-200 ease-in-out`}
        >
          <FileTreePanel
            rootPath={rootPath}
            tree={tree}
            selectedPath={selectedPath}
            onOpenFolder={openFolder}
            onSelectFile={selectPath}
            onOpenFile={openMarkdownFile}
            onCreateFile={createFile}
            onCreateFolder={createFolder}
            onRenamePath={renamePath}
            onDeletePath={deletePath}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 self-stretch justify-center overflow-y-auto bg-card px-10 py-8">
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
              ? "w-72 border-l border-border/80 bg-muted/35 px-2 py-2 opacity-100 backdrop-blur-sm max-xl:w-full"
              : "w-0 border-0 px-0 opacity-0 max-xl:hidden"
          } min-h-0 self-stretch overflow-y-auto transition-[width,opacity,transform] duration-200 ease-in-out`}
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
            <div className="px-2 py-2 text-xs text-muted-foreground">
              AI 패널 닫힘
            </div>
          )}
        </aside>
      </main>
      <Toaster />
    </div>
  );
}

export function App() {
  return (
    <ToastProviderInternal>
      <AppContent />
    </ToastProviderInternal>
  );
}
