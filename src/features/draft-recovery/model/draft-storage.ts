import { DEFAULT_DOC } from "@/shared/config";

export const DRAFT_STORAGE_VERSION = 1;
const LATEST_DRAFT_KEY = "geur_editor_draft_v1";
const DRAFT_HISTORY_KEY = "geur_editor_draft_history_v1";
const HISTORY_LIMIT = 10;

export type DraftSnapshot = {
  version: number;
  docText: string;
  filePath: string;
  updatedAt: number;
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

function parseHistory(raw: string | null): DraftSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DraftSnapshot[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => parseSnapshot(JSON.stringify(entry)))
      .filter((entry): entry is DraftSnapshot => entry !== null);
  } catch {
    return [];
  }
}

export function createDraftSnapshot(docText: string, filePath: string): DraftSnapshot {
  return {
    version: DRAFT_STORAGE_VERSION,
    docText,
    filePath,
    updatedAt: Date.now(),
  };
}

export function hasUsefulDraft(docText: string) {
  return docText.trim().length > 0 && docText !== DEFAULT_DOC;
}

export function getLatestDraftSnapshot() {
  return parseSnapshot(localStorage.getItem(LATEST_DRAFT_KEY));
}

export function setLatestDraftSnapshot(snapshot: DraftSnapshot) {
  localStorage.setItem(LATEST_DRAFT_KEY, JSON.stringify(snapshot));
}

export function clearLatestDraftSnapshot() {
  localStorage.removeItem(LATEST_DRAFT_KEY);
}

export function appendDraftHistory(snapshot: DraftSnapshot) {
  const history = parseHistory(localStorage.getItem(DRAFT_HISTORY_KEY));
  const last = history[history.length - 1];
  if (last && last.docText === snapshot.docText) {
    return;
  }
  const next = [...history, snapshot].slice(-HISTORY_LIMIT);
  localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(next));
}

export function getDraftHistory() {
  return parseHistory(localStorage.getItem(DRAFT_HISTORY_KEY));
}
