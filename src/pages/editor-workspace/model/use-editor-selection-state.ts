import { useCallback, useState, useTransition, type RefObject } from "react";
import type { SelectionState } from "@/shared/model";

const DEFAULT_SELECTION: SelectionState = { from: 0, to: 0, text: "" };

type UseEditorSelectionStateParams = {
  selectionRef: RefObject<SelectionState>;
};

export function useEditorSelectionState({
  selectionRef,
}: UseEditorSelectionStateParams) {
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [, startSelectionTransition] = useTransition();

  const updateSelection = useCallback(
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
    [selectionRef, startSelectionTransition],
  );

  return {
    selection,
    updateSelection,
  };
}
