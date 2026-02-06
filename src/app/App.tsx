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
import { SelectionState, PendingChange, FileNode } from "@/shared/model";
import { buildDiffHtml, DiffWidget } from "@/features/ai-diff";
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
  const [rootPath, setRootPath] = useState("");
  const [tree, setTree] = useState<FileNode | null>(null);
  const [selectedPath, setSelectedPath] = useState("");

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

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

  const refreshTree = useCallback(async (nextRoot?: string) => {
    const root = nextRoot ?? rootPath;
    if (!root) return;
    const nextTree = await invoke<FileNode>("list_tree", { rootPath: root });
    setTree(nextTree);
  }, [rootPath]);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    setRootPath(path);
    setSelectedPath("");
    await refreshTree(path);
  }, [refreshTree]);

  const { push } = useToast();

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
      setSelectedPath(relativePath);
      setStatus(`열기 완료: ${fullPath}`);
    },
    [push, rootPath],
  );

  const handleSelectFile = useCallback(
    async (relativePath: string) => {
      setSelectedPath(relativePath);
    },
    [],
  );

  const handleCreateFile = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      try {
        await invoke("create_file", { rootPath, relativePath });
        setStatus(`파일 생성: ${relativePath}`);
        await refreshTree();
      } catch (error) {
        const message =
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : JSON.stringify(error);
        setStatus(`파일 생성 실패: ${message}`);
      }
    },
    [refreshTree, rootPath],
  );

  const handleCreateFolder = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      try {
        await invoke("create_folder", { rootPath, relativePath });
        setStatus(`폴더 생성: ${relativePath}`);
        await refreshTree();
      } catch (error) {
        const message =
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : JSON.stringify(error);
        setStatus(`폴더 생성 실패: ${message}`);
      }
    },
    [refreshTree, rootPath],
  );

  const handleRenamePath = useCallback(
    async (payload: string) => {
      if (!rootPath) return;
      const [from, to] = payload.split("::");
      if (!from || !to) return;
      try {
        await invoke("rename_path", { rootPath, from, to });
        setStatus(`이름 변경: ${from} → ${to}`);
        await refreshTree();
      } catch (error) {
        const message =
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : JSON.stringify(error);
        setStatus(`이름 변경 실패: ${message}`);
      }
    },
    [refreshTree, rootPath],
  );

  const handleDeletePath = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      const confirmed = window.confirm(`삭제할까요? ${relativePath}`);
      if (!confirmed) return;
      try {
        await invoke("delete_path", { rootPath, relativePath });
        setStatus(`삭제 완료: ${relativePath}`);
        await refreshTree();
      } catch (error) {
        const message =
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : JSON.stringify(error);
        setStatus(`삭제 실패: ${message}`);
      }
    },
    [refreshTree, rootPath],
  );

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <Topbar
        filePath={filePath}
        isAiOpen={isAiOpen}
        isLeftOpen={isLeftOpen}
        apiKey={apiKey}
        onOpen={handleOpen}
        onSave={handleSave}
        onToggleAi={handleToggleAi}
        onToggleLeft={handleToggleLeft}
        onSaveApiKey={(value) => {
          setApiKey(value);
          localStorage.setItem("openai_api_key", value);
          setStatus("API 키가 저장되었습니다.");
        }}
      />

      <main className="grid flex-1 grid-cols-[auto_minmax(0,1fr)_auto] gap-4 px-5 py-6 max-xl:grid-cols-1">
        <aside
          className={`${
            isLeftOpen
              ? "w-64 border border-zinc-200 bg-white px-4 py-4 opacity-100 max-xl:w-full"
              : "w-0 border-0 px-0 opacity-0 max-xl:hidden"
          } rounded-xl transition-[width,opacity,transform] duration-200 ease-in-out`}
        >
          <FileTreePanel
            rootPath={rootPath}
            tree={tree}
            selectedPath={selectedPath}
            onOpenFolder={handleOpenFolder}
            onSelectFile={handleSelectFile}
            onOpenFile={openMarkdownFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRenamePath={handleRenamePath}
            onDeletePath={handleDeletePath}
          />
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
