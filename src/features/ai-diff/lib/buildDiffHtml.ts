import { diffWordsWithSpace } from "diff";
import { escapeHtml } from "@/shared/lib";

export function buildDiffHtml(originalText: string, suggestedText: string) {
  const changes = diffWordsWithSpace(originalText, suggestedText);
  return changes
    .map((part) => {
      const safe = escapeHtml(part.value);
      if (part.added) {
        return `<span class="diff-added">${safe}</span>`;
      }
      if (part.removed) {
        return `<span class="diff-removed">${safe}</span>`;
      }
      return `<span class="diff-unchanged">${safe}</span>`;
    })
    .join("");
}
