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
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { EditorPanel } from "@/widgets/editor-panel";
import { FileTreePanel } from "@/widgets/file-tree";
import { AiPanel } from "@/widgets/ai-panel";
import { Topbar } from "@/widgets/topbar";
import { DEFAULT_DOC, MODEL_OPTIONS } from "@/shared/config";
import {
  SelectionState,
  PendingChange,
  PromptAttachmentDraft,
  PromptAttachmentPayload,
  RewriteResult,
  WorkspaceDroppedFile,
} from "@/shared/model";
import { buildDiffHtml, DiffWidget } from "@/features/ai-diff";
import { useFileTree } from "@/features/file-tree";
import { useThemeMode } from "@/features/theme";
import { getDocumentTitle } from "@/entities/document";
import { useToast } from "@/shared/ui";

const DEFAULT_SELECTION: SelectionState = { from: 0, to: 0, text: "" };
const TOKEN_REGEX = /@첨부\[[^\]]+\]/g;
const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_BYTES = 200 * 1024;
const SUPPORTED_TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".mdx",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".csv",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".rs",
  ".go",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".css",
  ".html",
  ".xml",
  ".sql",
]);

function extractPromptTokens(prompt: string) {
  return new Set(prompt.match(TOKEN_REGEX) ?? []);
}

function getBasename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function getExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

export function EditorWorkspacePage() {
  const editorRef = useRef<EditorView | null>(null);
  const selectionRef = useRef<SelectionState>(DEFAULT_SELECTION);
  const attachmentsByTokenRef = useRef<Map<string, PromptAttachmentDraft>>(
    new Map(),
  );
  const [docText, setDocText] = useState(DEFAULT_DOC);
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [, startSelectionTransition] = useTransition();
  const [userPrompt, setUserPrompt] = useState("더 명확하고 간결하게 다듬어줘.");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState("");
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

  const handleUserPromptChange = useCallback((value: string) => {
    setUserPrompt(value);
    const activeTokens = extractPromptTokens(value);
    for (const token of attachmentsByTokenRef.current.keys()) {
      if (!activeTokens.has(token)) {
        attachmentsByTokenRef.current.delete(token);
      }
    }
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
    const activeSelection = selectionRef.current;
    if (activeSelection.from === activeSelection.to) {
      setStatus("선택된 텍스트가 없어요.");
      return;
    }

    setIsBusy(true);
    setAiErrorMessage("");
    setStatus("AI가 수정안을 만들고 있어요...");

    try {
      if (!apiKey) {
        setStatus("API 키가 필요합니다. 상단 설정에서 입력해 주세요.");
        setIsBusy(false);
        return;
      }
      const selectedText =
        editorRef.current?.state.sliceDoc(
          activeSelection.from,
          activeSelection.to,
        ) ??
        docText.slice(activeSelection.from, activeSelection.to);

      const usedTokens = extractPromptTokens(userPrompt);
      const attachments: PromptAttachmentPayload[] = Array.from(
        attachmentsByTokenRef.current.values(),
      )
        .filter((item) => usedTokens.has(item.token))
        .map(({ token, name, content, source }) => ({
          token,
          name,
          content,
          source,
        }));

      const result = await invoke<RewriteResult>("rewrite_text", {
        model: modelId,
        prompt: userPrompt,
        selectedText,
        apiKey,
        attachments,
      });

      if (result.userError) {
        setAiErrorMessage(result.userError);
        setStatus("수정안을 만들지 못했어요. 오류 메시지를 확인해 주세요.");
        push({
          title: "AI 수정 요청 제한",
          description: result.userError,
          variant: "destructive",
        });
        return;
      }

      if (!result.suggestedText) {
        setStatus("수정안을 생성하지 못했어요. 다시 시도해 주세요.");
        return;
      }

      setPendingChange({
        from: activeSelection.from,
        to: activeSelection.to,
        originalText: selectedText,
        suggestedText: result.suggestedText,
      });
      if (editorRef.current) {
        editorRef.current.dispatch({
          selection: { anchor: activeSelection.to },
        });
      }
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
  }, [apiKey, docText, isBusy, modelId, pendingChange, push, userPrompt]);

  const createAttachmentToken = useCallback(
    (name: string) => {
      const existingTokens = new Set([
        ...attachmentsByTokenRef.current.keys(),
        ...Array.from(extractPromptTokens(userPrompt)),
      ]);
      let index = 1;
      while (true) {
        const suffix = index === 1 ? "" : `#${index}`;
        const token = `@첨부[${name}${suffix}]`;
        if (!existingTokens.has(token)) {
          return token;
        }
        index += 1;
      }
    },
    [userPrompt],
  );

  const pushAttachments = useCallback(
    (drafts: Array<Omit<PromptAttachmentDraft, "token">>) => {
      if (drafts.length === 0) return [];
      const allowedCount = Math.max(
        0,
        MAX_ATTACHMENT_COUNT - attachmentsByTokenRef.current.size,
      );
      const accepted = drafts.slice(0, allowedCount);
      const tokens: string[] = [];

      for (const draft of accepted) {
        const token = createAttachmentToken(draft.name);
        attachmentsByTokenRef.current.set(token, { ...draft, token });
        tokens.push(token);
      }
      return tokens;
    },
    [createAttachmentToken],
  );

  const attachExternalFiles = useCallback(
    async (files: File[]) => {
      const drafts: Array<Omit<PromptAttachmentDraft, "token">> = [];
      let skippedInvalid = 0;
      let skippedSize = 0;
      let skippedRead = 0;

      for (const file of files) {
        const ext = getExtension(file.name);
        if (!SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
          skippedInvalid += 1;
          continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          skippedSize += 1;
          continue;
        }
        try {
          const content = await file.text();
          if (content.includes("\u0000")) {
            skippedInvalid += 1;
            continue;
          }
          drafts.push({
            name: file.name,
            content,
            source: "external",
            size: file.size,
          });
        } catch {
          skippedRead += 1;
        }
      }

      const tokens = pushAttachments(drafts);
      const skippedByLimit = Math.max(0, drafts.length - tokens.length);
      setStatus(
        `첨부 추가: ${tokens.length}개${
          skippedInvalid ? `, 형식 제외 ${skippedInvalid}개` : ""
        }${skippedSize ? `, 용량 제외 ${skippedSize}개` : ""}${
          skippedRead ? `, 읽기 실패 ${skippedRead}개` : ""
        }${skippedByLimit ? `, 개수 제한 제외 ${skippedByLimit}개` : ""}`,
      );
      return tokens;
    },
    [pushAttachments],
  );

  const attachExternalPaths = useCallback(
    async (paths: string[]) => {
      const drafts: Array<Omit<PromptAttachmentDraft, "token">> = [];
      let skippedInvalid = 0;
      let skippedSize = 0;
      let skippedRead = 0;

      for (const path of paths) {
        const name = getBasename(path);
        const ext = getExtension(name);
        if (!SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
          skippedInvalid += 1;
          continue;
        }
        try {
          const content = await readTextFile(path);
          const size = new Blob([content]).size;
          if (size > MAX_ATTACHMENT_BYTES || content.includes("\u0000")) {
            skippedSize += 1;
            continue;
          }
          drafts.push({
            name,
            content,
            source: "external",
            size,
          });
        } catch {
          skippedRead += 1;
        }
      }

      const tokens = pushAttachments(drafts);
      const skippedByLimit = Math.max(0, drafts.length - tokens.length);
      setStatus(
        `외부 경로 첨부: ${tokens.length}개${
          skippedInvalid ? `, 형식 제외 ${skippedInvalid}개` : ""
        }${skippedSize ? `, 용량 제외 ${skippedSize}개` : ""}${
          skippedRead ? `, 읽기 실패 ${skippedRead}개` : ""
        }${skippedByLimit ? `, 개수 제한 제외 ${skippedByLimit}개` : ""}`,
      );
      return tokens;
    },
    [pushAttachments],
  );

  const attachWorkspaceFiles = useCallback(
    async (files: WorkspaceDroppedFile[]) => {
      if (!rootPath) {
        setStatus("폴더를 먼저 열어야 파일 첨부를 사용할 수 있어요.");
        return [];
      }

      const drafts: Array<Omit<PromptAttachmentDraft, "token">> = [];
      let skippedInvalid = 0;
      let skippedSize = 0;
      let skippedRead = 0;

      for (const file of files) {
        const ext = getExtension(file.name);
        if (!SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
          skippedInvalid += 1;
          continue;
        }
        const relativePath = file.path.replace(/^\/+/, "");
        const fullPath = `${rootPath}/${relativePath}`;
        try {
          const content = await readTextFile(fullPath);
          const size = new Blob([content]).size;
          if (size > MAX_ATTACHMENT_BYTES || content.includes("\u0000")) {
            skippedSize += 1;
            continue;
          }
          drafts.push({
            name: getBasename(file.name),
            content,
            source: "workspace",
            size,
          });
        } catch {
          skippedRead += 1;
        }
      }

      const tokens = pushAttachments(drafts);
      const skippedByLimit = Math.max(0, drafts.length - tokens.length);
      setStatus(
        `워크스페이스 첨부: ${tokens.length}개${
          skippedInvalid ? `, 형식 제외 ${skippedInvalid}개` : ""
        }${skippedSize ? `, 용량 제외 ${skippedSize}개` : ""}${
          skippedRead ? `, 읽기 실패 ${skippedRead}개` : ""
        }${skippedByLimit ? `, 개수 제한 제외 ${skippedByLimit}개` : ""}`,
      );
      return tokens;
    },
    [pushAttachments, rootPath],
  );

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
    setAiErrorMessage("");
    setStatus("수정이 적용되었습니다.");
  }, [pendingChange]);

  const undoChange = useCallback(() => {
    if (!pendingChange) return;
    setPendingChange(null);
    setAiErrorMessage("");
    setStatus("수정이 취소되었습니다.");
  }, [pendingChange]);

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
