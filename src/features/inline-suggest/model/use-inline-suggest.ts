import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EditorView } from "@codemirror/view";
import type { SelectionState } from "@/shared/model";

const CONTEXT_BEFORE_LIMIT = 1200;
const CONTEXT_AFTER_LIMIT = 320;
const BEFORE_THRESHOLD = 16;
const CACHE_KEY_BEFORE = 220;
const CACHE_KEY_AFTER = 120;
const REQUEST_DEBOUNCE_MS = 420;
const CACHE_LIMIT = 80;

export type InlineSuggestion = {
  pos: number;
  text: string;
};

type UseInlineSuggestParams = {
  editorRef: React.RefObject<EditorView | null>;
  selectionRef: React.RefObject<SelectionState>;
  docText: string;
  selection: SelectionState;
  modelId: string;
  apiKey: string;
  disabled: boolean;
};

function normalizeSuggestion(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\s*\n+\s*/g, " ").trim();
}

export function useInlineSuggest({
  editorRef,
  selectionRef,
  docText,
  selection,
  modelId,
  apiKey,
  disabled,
}: UseInlineSuggestParams) {
  const [suggestion, setSuggestion] = useState<InlineSuggestion | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const setCached = useCallback((key: string, value: string) => {
    if (cacheRef.current.has(key)) {
      cacheRef.current.delete(key);
    }
    cacheRef.current.set(key, value);
    if (cacheRef.current.size <= CACHE_LIMIT) return;
    const oldestKey = cacheRef.current.keys().next().value;
    if (oldestKey) {
      cacheRef.current.delete(oldestKey);
    }
  }, []);

  useEffect(() => {
    if (disabled || !apiKey) {
      setSuggestion(null);
      return;
    }
    if (selection.from !== selection.to) {
      setSuggestion(null);
      return;
    }

    const cursor = selection.from;
    const before = docText.slice(
      Math.max(0, cursor - CONTEXT_BEFORE_LIMIT),
      cursor,
    );
    const after = docText.slice(
      cursor,
      Math.min(docText.length, cursor + CONTEXT_AFTER_LIMIT),
    );

    if (before.trim().length < BEFORE_THRESHOLD) {
      setSuggestion(null);
      return;
    }

    const cacheKey = `${modelId}::${before.slice(-CACHE_KEY_BEFORE)}::${after.slice(0, CACHE_KEY_AFTER)}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey) ?? "";
      setSuggestion(cached ? { pos: cursor, text: cached } : null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await invoke<string>("suggest_next_text", {
          model: modelId,
          beforeText: before,
          afterText: after,
          apiKey,
        });

        if (requestIdRef.current !== currentRequestId) return;
        const text = normalizeSuggestion(result);
        setCached(cacheKey, text);
        if (!text) {
          setSuggestion(null);
          return;
        }

        const latest = selectionRef.current;
        if (latest.from !== latest.to || latest.from !== cursor) {
          return;
        }
        setSuggestion({ pos: cursor, text });
      } catch {
        if (requestIdRef.current === currentRequestId) {
          setSuggestion(null);
        }
      }
    }, REQUEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [apiKey, disabled, docText, modelId, selection, selectionRef, setCached]);

  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return false;
    const view = editorRef.current;
    if (!view) return false;
    const head = view.state.selection.main.head;
    if (head !== suggestion.pos) return false;
    view.dispatch({
      changes: {
        from: suggestion.pos,
        to: suggestion.pos,
        insert: suggestion.text,
      },
      selection: {
        anchor: suggestion.pos + suggestion.text.length,
      },
    });
    setSuggestion(null);
    return true;
  }, [editorRef, suggestion]);

  return {
    suggestion,
    setSuggestion,
    acceptSuggestion,
  };
}
