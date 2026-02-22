import { useCallback } from "react";
import type { EditorView } from "@codemirror/view";
import { save } from "@tauri-apps/plugin-dialog";
import { normalizeFilePath, safeWriteTextFile } from "@/shared/lib";

type UseEmergencyDraftActionsParams = {
  editorRef: React.RefObject<EditorView | null>;
  docText: string;
  filePath: string;
  onStatus: (message: string) => void;
  saveSnapshot: (docText: string, filePath: string, includeHistory: boolean) => void;
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }
}

export function useEmergencyDraftActions({
  editorRef,
  docText,
  filePath,
  onStatus,
  saveSnapshot,
}: UseEmergencyDraftActionsParams) {
  const getLiveDocText = useCallback(
    () => editorRef.current?.state.doc.toString() ?? docText,
    [docText, editorRef],
  );

  const handleEmergencyCopy = useCallback(async () => {
    const text = getLiveDocText();
    const copied = await copyText(text);
    if (!copied) {
      onStatus("긴급 복사 실패: 텍스트를 수동 복사해 주세요.");
      return;
    }
    saveSnapshot(text, filePath, true);
    onStatus("긴급 복사 완료");
  }, [filePath, getLiveDocText, onStatus, saveSnapshot]);

  const handleEmergencySave = useCallback(async () => {
    const text = getLiveDocText();
    const defaultPath = filePath && filePath.endsWith(".md") ? filePath : "recovery.md";
    const selectedPath = await save({
      defaultPath,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!selectedPath) return;

    const normalizedPath = normalizeFilePath(selectedPath);
    try {
      await safeWriteTextFile(normalizedPath, text);
      saveSnapshot(text, normalizedPath, true);
      onStatus(`긴급 저장 완료: ${normalizedPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onStatus(`긴급 저장 실패: ${message}`);
    }
  }, [filePath, getLiveDocText, onStatus, saveSnapshot]);

  return {
    handleEmergencyCopy,
    handleEmergencySave,
  };
}
