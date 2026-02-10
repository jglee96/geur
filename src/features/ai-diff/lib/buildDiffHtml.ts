import { escapeHtml } from "@/shared/lib";

export function buildDiffHtml(_originalText: string, suggestedText: string) {
  const toCompactLine = (text: string) =>
    text
      .replace(/\r\n/g, "\n")
      .replace(/^[\s\n]+|[\s\n]+$/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

  const compactOriginal = toCompactLine(_originalText);
  const compactSuggested = toCompactLine(suggestedText);
  const hasOriginal = compactOriginal.length > 0;
  const hasSuggested = compactSuggested.length > 0;

  const originalRow = hasOriginal
    ? `<div class="grid grid-cols-[14px_1fr] items-start gap-2 border-b border-border/70 bg-rose-500/12 px-3 py-1.5 text-foreground/90">
        <span class="pt-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300/95">-</span>
        <span class="break-words text-[15px] leading-[1.55]">${escapeHtml(compactOriginal)}</span>
      </div>`
    : "";

  const suggestedRow = hasSuggested
    ? `<div class="grid grid-cols-[14px_1fr] items-start gap-2 bg-emerald-500/12 px-3 py-1.5 text-foreground">
        <span class="pt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300/95">+</span>
        <span class="break-words text-[15px] leading-[1.55]">${escapeHtml(compactSuggested)}</span>
      </div>`
    : "";

  return `<div class="overflow-hidden rounded-md border border-border/80 bg-background">${originalRow}${suggestedRow}</div>`;
}
