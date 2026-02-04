import React from "react";

type TopbarProps = {
  filePath: string;
  isAiOpen: boolean;
  onOpen: () => void;
  onSave: () => void;
  onToggleAi: () => void;
};

export function Topbar({
  filePath,
  isAiOpen,
  onOpen,
  onSave,
  onToggleAi,
}: TopbarProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-white/60 bg-white/70 px-6 py-5 shadow-[0_20px_50px_rgba(31,25,18,0.12)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight text-zinc-900">
          Diff Note
        </div>
        <div className="text-sm text-zinc-500">
          한 줄씩 생각하고, diff로 적용하는 AI 글쓰기
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleAi}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-600"
        >
          <span
            className={`h-2.5 w-2.5 rounded-full border ${
              isAiOpen
                ? "border-emerald-400 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                : "border-zinc-300 bg-zinc-200"
            }`}
          />
          AI 패널
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-600"
        >
          파일 열기
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)] transition hover:bg-emerald-700"
        >
          저장
        </button>
        <div className="rounded-full bg-zinc-100 px-3 py-2 text-[11px] text-zinc-500">
          {filePath ? filePath : "새 문서"}
        </div>
      </div>
    </header>
  );
}
