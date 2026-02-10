import { diffWordsWithSpace } from "diff";
import { escapeHtml } from "@/shared/lib";

export function buildDiffHtml(originalText: string, suggestedText: string) {
  const changes = diffWordsWithSpace(originalText, suggestedText);
  return changes
    .map((part) => {
      const safe = escapeHtml(part.value);
      if (part.added) {
        return `<span class="rounded bg-emerald-200/60 px-0.5 text-emerald-900">${safe}</span>`;
      }
      if (part.removed) {
        return `<span class="rounded bg-rose-200/50 px-0.5 text-rose-700 line-through">${safe}</span>`;
      }
      return `<span class="text-foreground">${safe}</span>`;
    })
    .join("");
}
