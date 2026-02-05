import React, { memo } from "react";

type TopbarProps = {
  filePath: string;
  isAiOpen: boolean;
  onOpen: () => void;
  onSave: () => void;
  onToggleAi: () => void;
};

export const Topbar = memo(function Topbar({
  filePath,
  isAiOpen,
  onOpen,
  onSave,
  onToggleAi,
}: TopbarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-4 px-4 pt-3 text-sm text-zinc-600">
        <div className="flex items-center gap-3">
          <button className="border-b-2 border-emerald-600 pb-2 text-sm font-semibold text-zinc-900">
            홈
          </button>
          <button className="pb-2 text-sm text-zinc-500 hover:text-zinc-900">
            삽입
          </button>
          <button className="pb-2 text-sm text-zinc-500 hover:text-zinc-900">
            보기
          </button>
        </div>
        <div className="ml-auto text-xs text-zinc-500">
          {filePath ? filePath : "새 문서"}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-2">
        <button
          type="button"
          onClick={onToggleAi}
          className="inline-flex items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400"
        >
          <span
            className={`h-2.5 w-2.5 rounded-full border ${
              isAiOpen
                ? "border-emerald-500 bg-emerald-500"
                : "border-zinc-300 bg-zinc-200"
            }`}
          />
          AI 패널
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400"
        >
          열기
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          저장
        </button>
      </div>
    </header>
  );
});
