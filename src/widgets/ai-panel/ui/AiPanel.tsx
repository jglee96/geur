import React, { memo, useCallback, useEffect, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { PendingChange, WorkspaceDroppedFile } from "@/shared/model";
import {
  WORKSPACE_ATTACHMENT_MIME,
  WORKSPACE_ATTACHMENT_TEXT_PREFIX,
} from "@/shared/config";
import {
  clearWorkspaceDrag,
  getWorkspaceDrag,
} from "@/shared/lib/workspace-drag-store";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from "@/shared/ui";

type AiPanelProps = {
  userPrompt: string;
  modelId: string;
  modelOptions: { id: string; label: string }[];
  pendingChange: PendingChange | null;
  isBusy: boolean;
  status: string;
  onModelChange: (value: string) => void;
  onUserPromptChange: (value: string) => void;
  onRequestChange: () => void;
  onAcceptChange: () => void;
  onUndoChange: () => void;
  onAttachExternalFiles: (files: File[]) => Promise<string[]>;
  onAttachExternalPaths: (paths: string[]) => Promise<string[]>;
  onAttachWorkspaceFiles: (files: WorkspaceDroppedFile[]) => Promise<string[]>;
};

export const AiPanel = memo(function AiPanel({
  userPrompt,
  modelId,
  modelOptions,
  pendingChange,
  isBusy,
  status,
  onModelChange,
  onUserPromptChange,
  onRequestChange,
  onAcceptChange,
  onUndoChange,
  onAttachExternalFiles,
  onAttachExternalPaths,
  onAttachWorkspaceFiles,
}: AiPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertTokensAtCaret = useCallback(
    (tokens: string[]) => {
      if (!tokens.length) return;
      const textarea = textareaRef.current;
      const joined = tokens.join(" ");
      if (!textarea) {
        const space = userPrompt.trim() ? " " : "";
        onUserPromptChange(`${userPrompt}${space}${joined}`);
        return;
      }

      const start = textarea.selectionStart ?? userPrompt.length;
      const end = textarea.selectionEnd ?? start;
      const before = userPrompt.slice(0, start);
      const after = userPrompt.slice(end);
      const leading = before.length > 0 && !/\s$/.test(before) ? " " : "";
      const trailing = after.length > 0 && !/^\s/.test(after) ? " " : "";
      const insertion = `${leading}${joined}${trailing}`;
      textarea.setRangeText(insertion, start, end, "end");
      onUserPromptChange(textarea.value);
      textarea.focus();
    },
    [onUserPromptChange, userPrompt],
  );

  const parseWorkspaceDrop = (
    dataTransfer: DataTransfer,
    allowStoreFallback: boolean,
  ): WorkspaceDroppedFile[] => {
    const raw = dataTransfer.getData(WORKSPACE_ATTACHMENT_MIME);
    const fallbackRaw = dataTransfer.getData("text/plain");
    const candidate = raw || fallbackRaw;
    if (!candidate) return allowStoreFallback ? getWorkspaceDrag() : [];
    try {
      const normalized = candidate.startsWith(WORKSPACE_ATTACHMENT_TEXT_PREFIX)
        ? candidate.slice(WORKSPACE_ATTACHMENT_TEXT_PREFIX.length)
        : candidate;
      const parsed = JSON.parse(normalized) as
        | WorkspaceDroppedFile
        | WorkspaceDroppedFile[];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return allowStoreFallback ? getWorkspaceDrag() : [];
    }
  };

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const { dataTransfer } = event;
      const insertedTokens: string[] = [];
      const droppedFiles = Array.from(dataTransfer.files ?? []);
      const workspaceFiles = parseWorkspaceDrop(dataTransfer, true);
      let workspaceTokenCount = 0;

      if (workspaceFiles.length > 0) {
        const tokens = await onAttachWorkspaceFiles(workspaceFiles);
        insertedTokens.push(...tokens);
        workspaceTokenCount = tokens.length;
        clearWorkspaceDrag();
      }

      if ((workspaceFiles.length === 0 || workspaceTokenCount === 0) && droppedFiles.length > 0) {
        const tokens = await onAttachExternalFiles(droppedFiles);
        insertedTokens.push(...tokens);
        clearWorkspaceDrag();
      }

      insertTokensAtCaret(insertedTokens);
    },
    [insertTokensAtCaret, onAttachExternalFiles, onAttachWorkspaceFiles],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [],
  );

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent(async (event) => {
        if (disposed) return;
        if (event.payload.type !== "drop") return;
        const droppedPaths = event.payload.paths ?? [];
        const textarea = textareaRef.current;
        if (!textarea) return;
        const rect = textarea.getBoundingClientRect();
        const point = event.payload.position;
        const inside =
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom;
        if (!inside) return;

        const externalTokens = await onAttachExternalPaths(droppedPaths);

        if (externalTokens.length > 0) {
          insertTokensAtCaret(externalTokens);
          clearWorkspaceDrag();
          return;
        }

        // Some internal webview drags do not provide filesystem paths to Tauri.
        const workspaceFallback = getWorkspaceDrag();
        if (workspaceFallback.length > 0) {
          const workspaceTokens = await onAttachWorkspaceFiles(workspaceFallback);
          insertTokensAtCaret(workspaceTokens);
          clearWorkspaceDrag();
          return;
        }
      });
    };

    void setup();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [
    insertTokensAtCaret,
    onAttachExternalPaths,
    onAttachWorkspaceFiles,
  ]);

  return (
    <aside className="flex h-full flex-col gap-3 rounded-xl bg-background/55 p-2.5">
      <section className="space-y-2">
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          모델
        </div>
        <div>
          <Select value={modelId} onValueChange={onModelChange}>
            <SelectTrigger className="rounded-md bg-background/80">
              <SelectValue placeholder="모델 선택" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          수정 요청
        </div>
        <div className="rounded-md bg-muted px-2.5 py-2 text-[11px] text-muted-foreground">
          1) 문장에서 고칠 부분을 먼저 선택하세요.
          <br />
          2) 요청을 짧게 쓰고 AI 수정을 누르세요.
        </div>
        <div className="space-y-3" onDrop={handleDrop} onDragOver={handleDragOver}>
          <Textarea
            ref={textareaRef}
            value={userPrompt}
            onChange={(event) => onUserPromptChange(event.target.value)}
            placeholder="선택 영역을 어떻게 바꿀지 적어주세요."
            className="min-h-[120px] rounded-md bg-background/80"
          />
          <Button
            className="w-full rounded-md"
            onClick={onRequestChange}
            disabled={isBusy || !!pendingChange}
          >
            선택 영역 AI 수정
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          변경 사항
        </div>
        <div className="rounded-md border border-border bg-background/70 p-2.5">
          {pendingChange ? (
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">수정안 준비됨</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onAcceptChange}>
                  적용
                </Button>
                <Button size="sm" variant="outline" onClick={onUndoChange}>
                  되돌리기
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              선택한 텍스트가 있으면 여기에 변경 사항이 나타납니다.
            </div>
          )}
        </div>
      </section>

      <div className="mt-auto flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" />
        {status}
      </div>
    </aside>
  );
});
