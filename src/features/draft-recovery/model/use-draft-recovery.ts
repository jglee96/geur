import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendDraftHistory,
  clearLatestDraftSnapshot,
  createDraftSnapshot,
  getLatestDraftSnapshot,
  hasUsefulDraft,
  setLatestDraftSnapshot,
} from "./draft-storage";
const DRAFT_SAVE_DEBOUNCE_MS = 1500;
const MAX_DRAFT_SIZE = 800_000;
const HISTORY_SAVE_INTERVAL_MS = 15_000;

type UseDraftRecoveryParams = {
  docText: string;
  filePath: string;
  onRestore: (payload: { docText: string; filePath: string }) => void;
  onStatus: (message: string) => void;
};

export function useDraftRecovery({
  docText,
  filePath,
  onRestore,
  onStatus,
}: UseDraftRecoveryParams) {
  const hasPromptedRef = useRef(false);
  const warnedSizeRef = useRef(false);
  const lastHistorySavedAtRef = useRef(0);
  const [lastDraftUpdatedAt, setLastDraftUpdatedAt] = useState<number | null>(null);

  const clearDraft = useCallback(() => {
    clearLatestDraftSnapshot();
  }, []);

  const saveSnapshot = useCallback(
    (nextDocText: string, nextFilePath: string, includeHistory: boolean) => {
      if (!hasUsefulDraft(nextDocText)) {
        clearDraft();
        return;
      }

      if (nextDocText.length > MAX_DRAFT_SIZE) {
        if (!warnedSizeRef.current) {
          warnedSizeRef.current = true;
          onStatus("임시저장 한도를 초과해 자동 복구 저장을 건너뜁니다.");
        }
        return;
      }

      warnedSizeRef.current = false;
      const snapshot = createDraftSnapshot(nextDocText, nextFilePath);
      setLatestDraftSnapshot(snapshot);
      setLastDraftUpdatedAt(snapshot.updatedAt);

      if (!includeHistory) return;
      const elapsed = snapshot.updatedAt - lastHistorySavedAtRef.current;
      if (elapsed < HISTORY_SAVE_INTERVAL_MS) return;
      appendDraftHistory(snapshot);
      lastHistorySavedAtRef.current = snapshot.updatedAt;
    },
    [clearDraft, onStatus],
  );

  useEffect(() => {
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    const snapshot = getLatestDraftSnapshot();
    if (!snapshot) return;

    if (!hasUsefulDraft(snapshot.docText)) {
      clearDraft();
      return;
    }

    const updatedAt = new Date(snapshot.updatedAt).toLocaleString("ko-KR");
    const shouldRestore = window.confirm(
      `저장되지 않은 임시 초안(${updatedAt})을 찾았습니다.\n복원할까요?`,
    );
    if (!shouldRestore) {
      clearDraft();
      return;
    }

    onRestore({ docText: snapshot.docText, filePath: snapshot.filePath });
    onStatus("임시 초안을 복원했습니다.");
    setLastDraftUpdatedAt(snapshot.updatedAt);
  }, [clearDraft, onRestore, onStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveSnapshot(docText, filePath, true);
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [docText, filePath, saveSnapshot]);

  useEffect(() => {
    const flushDraft = () => {
      saveSnapshot(docText, filePath, true);
    };

    window.addEventListener("beforeunload", flushDraft);
    return () => window.removeEventListener("beforeunload", flushDraft);
  }, [docText, filePath, saveSnapshot]);

  return {
    clearDraft,
    saveSnapshot,
    lastDraftUpdatedAt,
  };
}
