import React from "react";
import { PendingChange } from "@/shared/model";

type AiPanelProps = {
  userPrompt: string;
  pendingChange: PendingChange | null;
  isBusy: boolean;
  status: string;
  onUserPromptChange: (value: string) => void;
  onRequestChange: () => void;
  onAcceptChange: () => void;
  onUndoChange: () => void;
};

export function AiPanel({
  userPrompt,
  pendingChange,
  isBusy,
  status,
  onUserPromptChange,
  onRequestChange,
  onAcceptChange,
  onUndoChange,
}: AiPanelProps) {
  return (
    <aside className="flex flex-col gap-5 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_18px_46px_rgba(31,25,18,0.1)] backdrop-blur">
      <div className="space-y-3">
        <div className="text-sm font-semibold text-zinc-800">수정 요청</div>
        <textarea
          className="min-h-[120px] w-full resize-y rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 text-sm text-zinc-800 shadow-inner focus:border-emerald-400 focus:outline-none"
          value={userPrompt}
          onChange={(event) => onUserPromptChange(event.target.value)}
          placeholder="선택 영역을 어떻게 바꿀지 적어주세요."
        />
        <button
          type="button"
          className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(16,185,129,0.35)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onRequestChange}
          disabled={isBusy || !!pendingChange}
        >
          AI 수정 요청
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-zinc-800">변경 사항</div>
        {pendingChange ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-zinc-200 bg-amber-50/70 p-4 text-xs text-zinc-600">
            <div className="font-semibold text-zinc-800">
              선택 영역 diff 미리보기
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                onClick={onAcceptChange}
              >
                적용
              </button>
              <button
                type="button"
                className="rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-rose-300 hover:text-rose-500"
                onClick={onUndoChange}
              >
                되돌리기
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4 text-xs text-zinc-500">
            선택한 텍스트가 있으면 여기에 변경 사항이 나타납니다.
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 rounded-xl bg-zinc-100/80 px-3 py-2 text-xs text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        {status}
      </div>
    </aside>
  );
}
