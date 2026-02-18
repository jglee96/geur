import { useMemo } from "react";
import { Prec, type Extension } from "@codemirror/state";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { buildDiffHtml, DiffWidget } from "@/features/ai-diff";
import {
  GhostSuggestionWidget,
  type InlineSuggestion,
} from "@/features/inline-suggest";
import type { PendingChange } from "@/shared/model";

type UseEditorExtensionsParams = {
  pendingChange: PendingChange | null;
  isBusy: boolean;
  inlineSuggestion: InlineSuggestion | null;
  onTab: () => boolean;
  onToggleAi: () => void;
};

export function useEditorExtensions({
  pendingChange,
  isBusy,
  inlineSuggestion,
  onTab,
  onToggleAi,
}: UseEditorExtensionsParams): Extension[] {
  const previewExtension = useMemo(() => {
    if (!pendingChange) return null;
    const diffHtml = buildDiffHtml(
      pendingChange.originalText,
      pendingChange.suggestedText,
    );
    const replaced = Decoration.replace({
      widget: new DiffWidget(diffHtml),
      block: true,
      inclusive: false,
    }).range(pendingChange.from, pendingChange.to);
    return EditorView.decorations.of(Decoration.set([replaced], true));
  }, [pendingChange]);

  const inlineSuggestionExtension = useMemo(() => {
    if (!inlineSuggestion) return null;
    const decoration = Decoration.widget({
      widget: new GhostSuggestionWidget(inlineSuggestion.text),
      side: 1,
    }).range(inlineSuggestion.pos);
    return EditorView.decorations.of(Decoration.set([decoration], true));
  }, [inlineSuggestion]);

  const editableExtension = useMemo(
    () => EditorView.editable.of(!pendingChange && !isBusy),
    [pendingChange, isBusy],
  );

  return useMemo(() => {
    const list: Extension[] = [
      markdown(),
      editableExtension,
      EditorView.lineWrapping,
      Prec.highest(
        keymap.of([
          {
            key: "Tab",
            run: onTab,
          },
          {
            key: "Mod-l",
            run: () => {
              onToggleAi();
              return true;
            },
          },
        ]),
      ),
    ];

    if (previewExtension) list.push(previewExtension);
    if (inlineSuggestionExtension) list.push(inlineSuggestionExtension);
    return list;
  }, [
    editableExtension,
    inlineSuggestionExtension,
    onTab,
    onToggleAi,
    previewExtension,
  ]);
}
