import {
  useCallback,
  useRef,
  useState,
} from "react";
import { EditorView } from "@codemirror/view";
import { EditorPanel } from "@/widgets/editor-panel";
import { FileTreePanel } from "@/widgets/file-tree";
import { AiPanel } from "@/widgets/ai-panel";
import { Topbar } from "@/widgets/topbar";
import { MODEL_OPTIONS } from "@/shared/config";
import { SelectionState } from "@/shared/model";
import { useDocumentIo } from "@/features/document-io";
import { useFileTree } from "@/features/file-tree";
import { useInlineSuggest, useInlineSuggestTabKey } from "@/features/inline-suggest";
import { useRewriteRequest } from "@/features/rewrite-request";
import { usePromptAttachments } from "@/features/prompt-attachments";
import { useDraftRecovery, useEmergencyDraftActions } from "@/features/draft-recovery";
import { getDocumentTitle } from "@/entities/document";
import { useToast } from "@/shared/ui";
import { useEditorExtensions } from "../model/use-editor-extensions";
import { useEditorDocumentState } from "../model/use-editor-document-state";
import { useEditorSelectionState } from "../model/use-editor-selection-state";
import { useEditorWorkspaceTopbar } from "../model/use-editor-workspace-topbar";

export function EditorWorkspacePage() {
  const editorRef = useRef<EditorView | null>(null);
  const selectionRef = useRef<SelectionState>({ from: 0, to: 0, text: "" });
  const [userPrompt, setUserPrompt] = useState("더 명확하고 간결하게 다듬어줘.");
  const [status, setStatus] = useState("준비됨");
  const [modelId, setModelId] = useState(MODEL_OPTIONS[0]?.id ?? "gpt-4o-mini");
  const {
    docText,
    docExternalVersion,
    filePath,
    setFilePath,
    applyExternalDocChange,
    handleDocChange,
  } = useEditorDocumentState();
  const {
    isAiOpen,
    isLeftOpen,
    apiKey,
    themeMode,
    setThemeMode,
    handleToggleAi,
    handleToggleLeft,
    handleSaveApiKey,
  } = useEditorWorkspaceTopbar({ onStatus: setStatus });
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
  const { selection, updateSelection } = useEditorSelectionState({
    selectionRef,
  });
  const { clearDraft, saveSnapshot, lastDraftUpdatedAt } = useDraftRecovery({
    docText,
    filePath,
    onRestore: ({ docText: recoveredDocText, filePath: recoveredPath }) => {
      applyExternalDocChange(recoveredDocText);
      setFilePath(recoveredPath);
    },
    onStatus: setStatus,
  });
  const { handleOpen, handleSave, openMarkdownFile } = useDocumentIo({
    docText,
    filePath,
    rootPath,
    onDocTextChange: applyExternalDocChange,
    onFilePathChange: setFilePath,
    onStatus: setStatus,
    onSelectPath: selectPath,
    pushToast: push,
    onSaveSuccess: () => {
      clearDraft();
    },
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
    setDocText: applyExternalDocChange,
    modelId,
    userPrompt,
    apiKey,
    buildAttachments: buildPayload,
    onStatus: setStatus,
    pushToast: push,
  });
  const {
    suggestion: inlineSuggestion,
    setSuggestion: setInlineSuggestion,
    acceptSuggestion,
  } = useInlineSuggest({
    editorRef,
    selectionRef,
    docText,
    selection,
    modelId,
    apiKey,
    disabled: Boolean(pendingChange) || isBusy,
  });
  const handleTabKey = useInlineSuggestTabKey({
    editorRef,
    inlineSuggestion,
    setInlineSuggestion,
    acceptSuggestion,
  });
  const handleSelectionChange = useCallback(
    (nextSelection: SelectionState) => {
      if (inlineSuggestion && nextSelection.from !== inlineSuggestion.pos) {
        setInlineSuggestion(null);
      }
      updateSelection(nextSelection);
    },
    [inlineSuggestion, setInlineSuggestion, updateSelection],
  );

  const docTitle = getDocumentTitle(docText, filePath);

  const extensions = useEditorExtensions({
    pendingChange,
    isBusy,
    inlineSuggestion,
    onTab: handleTabKey,
    onToggleAi: handleToggleAi,
  });

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
  }, []);

  const handleDocSnapshot = useCallback(
    (value: string) => {
      saveSnapshot(value, filePath, false);
    },
    [filePath, saveSnapshot],
  );

  const { handleEmergencyCopy, handleEmergencySave } = useEmergencyDraftActions({
    editorRef,
    docText,
    filePath,
    onStatus: setStatus,
    saveSnapshot,
  });

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
            docExternalVersion={docExternalVersion}
            selection={selection}
            extensions={extensions}
            lastDraftUpdatedAt={lastDraftUpdatedAt}
            pendingChange={pendingChange}
            onAcceptChange={acceptChange}
            onUndoChange={undoChange}
            onEditorReady={handleEditorReady}
            onDocChange={handleDocChange}
            onDocSnapshot={handleDocSnapshot}
            onSelectionChange={handleSelectionChange}
            onEmergencyCopy={handleEmergencyCopy}
            onEmergencySave={handleEmergencySave}
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
