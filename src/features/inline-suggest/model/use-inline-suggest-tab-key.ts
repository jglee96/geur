import { useCallback, useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import type { InlineSuggestion } from "./use-inline-suggest";

type UseInlineSuggestTabKeyParams = {
  editorRef: React.RefObject<EditorView | null>;
  inlineSuggestion: InlineSuggestion | null;
  setInlineSuggestion: (suggestion: InlineSuggestion | null) => void;
  acceptSuggestion: () => boolean;
};

export function useInlineSuggestTabKey({
  editorRef,
  inlineSuggestion,
  setInlineSuggestion,
  acceptSuggestion,
}: UseInlineSuggestTabKeyParams) {
  const inlineSuggestionRef = useRef<InlineSuggestion | null>(null);

  useEffect(() => {
    inlineSuggestionRef.current = inlineSuggestion;
  }, [inlineSuggestion]);

  const insertTwoSpaces = useCallback(() => {
    const view = editorRef.current;
    if (!view) return false;
    const range = view.state.selection.main;
    view.dispatch({
      changes: {
        from: range.from,
        to: range.to,
        insert: "  ",
      },
      selection: {
        anchor: range.from + 2,
      },
    });
    setInlineSuggestion(null);
    return true;
  }, [editorRef, setInlineSuggestion]);

  const applySuggestionAtCursor = useCallback(() => {
    const view = editorRef.current;
    const currentSuggestion = inlineSuggestionRef.current;
    if (!view || !currentSuggestion) return false;
    const range = view.state.selection.main;
    if (!range.empty) return false;
    view.dispatch({
      changes: {
        from: range.head,
        to: range.head,
        insert: currentSuggestion.text,
      },
      selection: {
        anchor: range.head + currentSuggestion.text.length,
      },
    });
    setInlineSuggestion(null);
    return true;
  }, [editorRef, setInlineSuggestion]);

  return useCallback(() => {
    const view = editorRef.current;
    if (!view) return false;
    const range = view.state.selection.main;
    if (!range.empty) {
      return insertTwoSpaces();
    }
    if (inlineSuggestionRef.current) {
      if (acceptSuggestion()) return true;
      if (applySuggestionAtCursor()) return true;
    }
    return insertTwoSpaces();
  }, [acceptSuggestion, applySuggestionAtCursor, editorRef, insertTwoSpaces]);
}
