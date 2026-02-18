import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EditorView } from "@codemirror/view";
import type { SelectionState } from "@/shared/model";

type InlineSuggestion = {
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
    const before = docText.slice(Math.max(0, cursor - 1200), cursor);
    const after = docText.slice(cursor, Math.min(docText.length, cursor + 320));

    if (before.trim().length < 16) {
      setSuggestion(null);
      return;
    }

    const cacheKey = `${modelId}::${before.slice(-220)}::${after.slice(0, 120)}`;
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
        cacheRef.current.set(cacheKey, text);
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
    }, 420);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [apiKey, disabled, docText, modelId, selection, selectionRef]);

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
