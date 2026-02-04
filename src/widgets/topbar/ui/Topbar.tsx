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
    <header className="topbar">
      <div className="brand">
        <div className="brand-title">Diff Note</div>
        <div className="brand-subtitle">
          한 줄씩 생각하고, diff로 적용하는 AI 글쓰기
        </div>
      </div>
      <div className="file-actions">
        <button type="button" className="ghost toggle" onClick={onToggleAi}>
          <span className={`toggle-dot ${isAiOpen ? "on" : ""}`} />
          AI 패널
        </button>
        <button type="button" className="ghost" onClick={onOpen}>
          파일 열기
        </button>
        <button type="button" className="primary" onClick={onSave}>
          저장
        </button>
        <div className="file-path">{filePath ? filePath : "새 문서"}</div>
      </div>
    </header>
  );
}
