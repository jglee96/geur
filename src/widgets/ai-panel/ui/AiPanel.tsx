import React, { memo } from "react";
import { PendingChange } from "@/shared/model";

type AiPanelProps = {
  userPrompt: string;
  modelId: string;
  modelOptions: { id: string; label: string }[];
  pendingChange: PendingChange | null;
  isBusy: boolean;
  status: string;
  onModelChange: (value: string) => void;
  onUserPromptChange: (value: string) => void;
  onRequestChange: () => void;
  onAcceptChange: () => void;
  onUndoChange: () => void;
};

export const AiPanel = memo(function AiPanel({
  userPrompt,
  modelId,
  modelOptions,
  pendingChange,
  isBusy,
  status,
  onModelChange,
  onUserPromptChange,
  onRequestChange,
  onAcceptChange,
  onUndoChange,
}: AiPanelProps) {
  return (
    <aside className="flex flex-col gap-4 border-l border-zinc-200 bg-white p-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-zinc-800">모델</div>
        <select
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-emerald-500 focus:outline-none"
          value={modelId}
          onChange={(event) => onModelChange(event.target.value)}
        >
          {modelOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        <div className="text-sm font-semibold text-zinc-800">수정 요청</div>
        <textarea
          className="min-h-[120px] w-full resize-y rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-emerald-500 focus:outline-none"
          value={userPrompt}
          onChange={(event) => onUserPromptChange(event.target.value)}
          placeholder="선택 영역을 어떻게 바꿀지 적어주세요."
        />
        <button
          type="button"
          className="w-full rounded border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onRequestChange}
          disabled={isBusy || !!pendingChange}
        >
          AI 수정 요청
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-zinc-800">변경 사항</div>
        {pendingChange ? (
          <div className="space-y-3 border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-600">
            <div className="font-semibold text-zinc-800">
              선택 영역 diff 미리보기
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                onClick={onAcceptChange}
              >
                적용
              </button>
              <button
                type="button"
                className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-rose-300 hover:text-rose-500"
                onClick={onUndoChange}
              >
                되돌리기
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-500">
            선택한 텍스트가 있으면 여기에 변경 사항이 나타납니다.
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        {status}
      </div>
    </aside>
  );
});
