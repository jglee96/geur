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
    <aside className="ai-panel">
      <div className="panel-section">
        <div className="panel-title">수정 요청</div>
        <textarea
          className="prompt-input"
          value={userPrompt}
          onChange={(event) => onUserPromptChange(event.target.value)}
          placeholder="선택 영역을 어떻게 바꿀지 적어주세요."
        />
        <button
          type="button"
          className="primary full"
          onClick={onRequestChange}
          disabled={isBusy || !!pendingChange}
        >
          AI 수정 요청
        </button>
      </div>

      <div className="panel-section">
        <div className="panel-title">변경 사항</div>
        {pendingChange ? (
          <div className="change-card">
            <div className="change-meta">선택 영역 diff 미리보기</div>
            <div className="change-actions">
              <button type="button" className="primary" onClick={onAcceptChange}>
                적용
              </button>
              <button type="button" className="ghost" onClick={onUndoChange}>
                되돌리기
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-card">
            선택한 텍스트가 있으면 여기에 변경 사항이 나타납니다.
          </div>
        )}
      </div>

      <div className="status-bar">
        <span className="status-dot" />
        {status}
      </div>
    </aside>
  );
}
