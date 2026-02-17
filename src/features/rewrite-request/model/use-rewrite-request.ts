import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EditorView } from "@codemirror/view";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  PendingChange,
  RewriteResult,
  SelectionState,
  PromptAttachmentPayload,
} from "@/shared/model";

type ToastPush = (toast: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

type UseRewriteRequestParams = {
  editorRef: RefObject<EditorView | null>;
  selectionRef: RefObject<SelectionState>;
  docText: string;
  setDocText: Dispatch<SetStateAction<string>>;
  modelId: string;
  userPrompt: string;
  apiKey: string;
  buildAttachments: () => PromptAttachmentPayload[];
  onStatus: (message: string) => void;
  pushToast: ToastPush;
};

function formatErrorMessage(error: unknown) {
  return typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : JSON.stringify(error);
}

export function useRewriteRequest({
  editorRef,
  selectionRef,
  docText,
  setDocText,
  modelId,
  userPrompt,
  apiKey,
  buildAttachments,
  onStatus,
  pushToast,
}: UseRewriteRequestParams) {
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const requestChange = useCallback(async () => {
    if (isBusy || pendingChange) return;
    const activeSelection = selectionRef.current;
    if (activeSelection.from === activeSelection.to) {
      onStatus("선택된 텍스트가 없어요.");
      return;
    }

    setIsBusy(true);
    setAiErrorMessage("");
    onStatus("AI가 수정안을 만들고 있어요...");

    try {
      if (!apiKey) {
        onStatus("API 키가 필요합니다. 상단 설정에서 입력해 주세요.");
        setIsBusy(false);
        return;
      }

      const selectedText =
        editorRef.current?.state.sliceDoc(
          activeSelection.from,
          activeSelection.to,
        ) ??
        docText.slice(activeSelection.from, activeSelection.to);

      const attachments = buildAttachments();
      const result = await invoke<RewriteResult>("rewrite_text", {
        model: modelId,
        prompt: userPrompt,
        selectedText,
        apiKey,
        attachments,
      });

      if (result.userError) {
        setAiErrorMessage(result.userError);
        onStatus("수정안을 만들지 못했어요. 오류 메시지를 확인해 주세요.");
        pushToast({
          title: "AI 수정 요청 제한",
          description: result.userError,
          variant: "destructive",
        });
        return;
      }

      if (!result.suggestedText) {
        onStatus("수정안을 생성하지 못했어요. 다시 시도해 주세요.");
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
      onStatus("수정안 준비 완료. 적용하거나 되돌릴 수 있어요.");
    } catch (error) {
      onStatus(`AI 요청 실패: ${formatErrorMessage(error)}`);
    } finally {
      setIsBusy(false);
    }
  }, [
    apiKey,
    buildAttachments,
    docText,
    editorRef,
    isBusy,
    modelId,
    onStatus,
    pendingChange,
    pushToast,
    selectionRef,
    userPrompt,
  ]);

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
    onStatus("수정이 적용되었습니다.");
  }, [editorRef, onStatus, pendingChange, setDocText]);

  const undoChange = useCallback(() => {
    if (!pendingChange) return;
    setPendingChange(null);
    setAiErrorMessage("");
    onStatus("수정이 취소되었습니다.");
  }, [onStatus, pendingChange]);

  return {
    pendingChange,
    aiErrorMessage,
    isBusy,
    requestChange,
    acceptChange,
    undoChange,
  };
}
