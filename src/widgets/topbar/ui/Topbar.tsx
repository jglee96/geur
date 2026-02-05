import React, { memo } from "react";

type TopbarProps = {
  filePath: string;
  isAiOpen: boolean;
  isLeftOpen: boolean;
  onOpen: () => void;
  onSave: () => void;
  onToggleAi: () => void;
  onToggleLeft: () => void;
};

export const Topbar = memo(function Topbar({
  filePath,
  isAiOpen,
  isLeftOpen,
  onOpen,
  onSave,
  onToggleAi,
  onToggleLeft,
}: TopbarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-4 px-7 pt-3 text-xs text-zinc-600">
        <div className="flex items-center gap-3">
          <button className="border-b-2 border-blue-600 pb-2 text-xs font-semibold text-zinc-900">
            홈
          </button>
          <button className="pb-2 text-xs text-zinc-500 hover:text-zinc-900">
            삽입
          </button>
          <button className="pb-2 text-xs text-zinc-500 hover:text-zinc-900">
            보기
          </button>
        </div>
        <div className="ml-auto rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-zinc-600">
          {filePath ? filePath : "새 문서"}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-6 py-2">
        <button
          type="button"
          onClick={onToggleLeft}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
        >
          <span
            className={`h-2 w-2 rounded-full border ${
              isLeftOpen
                ? "border-blue-600 bg-blue-600"
                : "border-zinc-300 bg-zinc-200"
            }`}
          />
          폴더
        </button>
        <button
          type="button"
          onClick={onToggleAi}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
        >
          <span
            className={`h-2 w-2 rounded-full border ${
              isAiOpen
                ? "border-blue-600 bg-blue-600"
                : "border-zinc-300 bg-zinc-200"
            }`}
          />
          AI 패널
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
        >
          열기
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-full border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:border-blue-700 hover:bg-blue-700"
        >
          저장
        </button>
      </div>
    </header>
  );
});
