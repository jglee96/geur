import { escapeHtml } from "@/shared/lib";
import { diffWordsWithSpace } from "diff";

export function buildDiffHtml(originalText: string, suggestedText: string) {
  const normalize = (text: string) =>
    text.replace(/\r\n/g, "\n").replace(/[\s\n]+$/g, "");
  const prev = normalize(originalText);
  const next = normalize(suggestedText);

  const chunks = diffWordsWithSpace(prev, next);
  const inline = chunks
    .map((chunk) => {
      const value = escapeHtml(chunk.value);
      if (!value) return "";
      if (chunk.added) {
        return `<span class="rounded-[3px] bg-emerald-500/22 text-emerald-900 dark:text-emerald-100">${value}</span>`;
      }
      if (chunk.removed) {
        return `<span class="rounded-[3px] bg-rose-500/20 text-rose-900 line-through decoration-rose-500/85 dark:text-rose-100">${value}</span>`;
      }
      return `<span>${value}</span>`;
    })
    .join("");

  return `<div class="rounded-md border border-border/70 bg-background/85 px-3 py-2 text-[15px] leading-[1.62] text-foreground whitespace-pre-wrap break-words">${inline}</div>`;
}
