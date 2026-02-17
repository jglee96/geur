import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { EditorPanel } from "@/widgets/editor-panel";
import { FileTreePanel } from "@/widgets/file-tree";
import { AiPanel } from "@/widgets/ai-panel";
import { Topbar } from "@/widgets/topbar";
import { DEFAULT_DOC, MODEL_OPTIONS } from "@/shared/config";
import { SelectionState } from "@/shared/model";
import { buildDiffHtml, DiffWidget } from "@/features/ai-diff";
import { useDocumentIo } from "@/features/document-io";
import { useFileTree } from "@/features/file-tree";
import { useRewriteRequest } from "@/features/rewrite-request";
import { useThemeMode } from "@/features/theme";
import { usePromptAttachments } from "@/features/prompt-attachments";
import { getDocumentTitle } from "@/entities/document";
import { useToast } from "@/shared/ui";

const DEFAULT_SELECTION: SelectionState = { from: 0, to: 0, text: "" };

export function EditorWorkspacePage() {
  const editorRef = useRef<EditorView | null>(null);
  const selectionRef = useRef<SelectionState>(DEFAULT_SELECTION);
  const [docText, setDocText] = useState(DEFAULT_DOC);
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [, startSelectionTransition] = useTransition();
  const [userPrompt, setUserPrompt] = useState("더 명확하고 간결하게 다듬어줘.");
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
  const {
    handleUserPromptChange,
    buildPayload,
    attachExternalFiles,
    attachExternalPaths,
    attachWorkspaceFiles,
  } = usePromptAttachments({
    userPrompt,
    setUserPrompt,
    rootPath,
    onStatus: setStatus,
  });
  const { handleOpen, handleSave, openMarkdownFile } = useDocumentIo({
    docText,
    filePath,
    rootPath,
    onDocTextChange: setDocText,
    onFilePathChange: setFilePath,
    onStatus: setStatus,
    onSelectPath: selectPath,
    pushToast: push,
  });
  const {
    pendingChange,
    aiErrorMessage,
    isBusy,
    requestChange,
    acceptChange,
    undoChange,
  } = useRewriteRequest({
    editorRef,
    selectionRef,
    docText,
    setDocText,
    modelId,
    userPrompt,
    apiKey,
    buildAttachments: buildPayload,
    onStatus: setStatus,
    pushToast: push,
  });

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
    const replaced = Decoration.replace({
      widget: new DiffWidget(diffHtml),
      block: true,
      inclusive: false,
    }).range(pendingChange.from, pendingChange.to);
    return EditorView.decorations.of(Decoration.set([replaced], true));
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

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
  }, []);

  const handleDocChange = useCallback((value: string) => {
    setDocText(value);
  }, []);

  const handleSelectionChange = useCallback(
    (nextSelection: SelectionState) => {
      selectionRef.current = nextSelection;
      startSelectionTransition(() => {
        setSelection((prev) => {
          if (prev.from === nextSelection.from && prev.to === nextSelection.to) {
            return prev;
          }
          return nextSelection;
        });
      });
    },
    [startSelectionTransition],
  );

  const handleSaveApiKey = useCallback((value: string) => {
    setApiKey(value);
    localStorage.setItem("openai_api_key", value);
    setStatus("API 키가 저장되었습니다.");
  }, []);

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
              errorMessage={aiErrorMessage}
              isBusy={isBusy}
              status={status}
              onModelChange={setModelId}
              onUserPromptChange={handleUserPromptChange}
              onRequestChange={requestChange}
              onAcceptChange={acceptChange}
              onUndoChange={undoChange}
              onAttachExternalFiles={attachExternalFiles}
              onAttachExternalPaths={attachExternalPaths}
              onAttachWorkspaceFiles={attachWorkspaceFiles}
            />
          ) : (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              AI 패널 닫힘
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
