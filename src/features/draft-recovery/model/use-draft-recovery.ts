import { useCallback, useEffect, useRef } from "react";
import { DEFAULT_DOC } from "@/shared/config";

const DRAFT_STORAGE_KEY = "geur_editor_draft_v1";
const DRAFT_STORAGE_VERSION = 1;
const DRAFT_SAVE_DEBOUNCE_MS = 1500;
const MAX_DRAFT_SIZE = 800_000;

type DraftSnapshot = {
  version: number;
  docText: string;
  filePath: string;
  updatedAt: number;
};

type UseDraftRecoveryParams = {
  docText: string;
  filePath: string;
  onRestore: (payload: { docText: string; filePath: string }) => void;
  onStatus: (message: string) => void;
};

function parseSnapshot(raw: string | null): DraftSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraftSnapshot;
    if (
      parsed.version !== DRAFT_STORAGE_VERSION ||
      typeof parsed.docText !== "string" ||
      typeof parsed.filePath !== "string" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useDraftRecovery({
  docText,
  filePath,
  onRestore,
  onStatus,
}: UseDraftRecoveryParams) {
  const hasPromptedRef = useRef(false);
  const warnedSizeRef = useRef(false);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    const snapshot = parseSnapshot(localStorage.getItem(DRAFT_STORAGE_KEY));
    if (!snapshot) return;

    const hasUsefulDraft =
      snapshot.docText.trim().length > 0 && snapshot.docText !== DEFAULT_DOC;
    if (!hasUsefulDraft) {
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
  }, [clearDraft, onRestore, onStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasUsefulDraft = docText.trim().length > 0 && docText !== DEFAULT_DOC;
      if (!hasUsefulDraft) {
        clearDraft();
        return;
      }

      if (docText.length > MAX_DRAFT_SIZE) {
        if (!warnedSizeRef.current) {
          warnedSizeRef.current = true;
          onStatus("임시저장 한도를 초과해 자동 복구 저장을 건너뜁니다.");
        }
        return;
      }
      warnedSizeRef.current = false;

      const snapshot: DraftSnapshot = {
        version: DRAFT_STORAGE_VERSION,
        docText,
        filePath,
        updatedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [clearDraft, docText, filePath, onStatus]);

  useEffect(() => {
    const flushDraft = () => {
      const hasUsefulDraft = docText.trim().length > 0 && docText !== DEFAULT_DOC;
      if (!hasUsefulDraft || docText.length > MAX_DRAFT_SIZE) return;
      const snapshot: DraftSnapshot = {
        version: DRAFT_STORAGE_VERSION,
        docText,
        filePath,
        updatedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    };

    window.addEventListener("beforeunload", flushDraft);
    return () => window.removeEventListener("beforeunload", flushDraft);
  }, [docText, filePath]);

  return {
    clearDraft,
  };
}
