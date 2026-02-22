import React from "react";
import { getLatestDraftSnapshot } from "@/features/draft-recovery";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
  draftText: string;
  updatedAt: number | null;
};

function downloadMarkdown(text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  anchor.href = url;
  anchor.download = `geur-recovery-${stamp}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: "",
      draftText: "",
      updatedAt: null,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<AppErrorBoundaryState> {
    const snapshot = getLatestDraftSnapshot();
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
      draftText: snapshot?.docText ?? "",
      updatedAt: snapshot?.updatedAt ?? null,
    };
  }

  componentDidCatch(error: unknown) {
    console.error("[app-error-boundary]", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const recoveredAt = this.state.updatedAt
      ? new Date(this.state.updatedAt).toLocaleString("ko-KR")
      : "없음";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-8 text-foreground">
        <div className="w-full max-w-4xl space-y-4 rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-semibold">오류가 발생했습니다</h1>
          <p className="text-sm text-muted-foreground">
            앱이 중단돼도 복구할 수 있게 임시 초안을 유지했습니다. 아래에서 바로 복사하거나
            마크다운으로 저장하세요.
          </p>
          <div className="text-xs text-muted-foreground">
            마지막 자동 저장: {recoveredAt}
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-destructive">
            {this.state.message || "알 수 없는 오류"}
          </div>
          <textarea
            className="h-72 w-full resize-y rounded-md border border-border bg-background p-3 text-sm"
            value={this.state.draftText}
            onChange={(event) => this.setState({ draftText: event.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              onClick={async () => {
                const ok = await copyToClipboard(this.state.draftText);
                if (!ok) {
                  window.alert("클립보드 복사에 실패했습니다. 텍스트를 직접 복사해 주세요.");
                }
              }}
            >
              텍스트 복사
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              onClick={() => downloadMarkdown(this.state.draftText)}
            >
              .md로 저장
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              onClick={() => window.location.reload()}
            >
              앱 다시 로드
            </button>
          </div>
        </div>
      </div>
    );
  }
}
