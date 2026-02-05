import React, { memo } from "react";
import { PendingChange } from "@/shared/model";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from "@/shared/ui";

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
    <aside className="flex flex-col gap-4">
      <Card>
        <CardHeader className="text-sm font-semibold">모델</CardHeader>
        <CardContent className="space-y-2">
          <Select value={modelId} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="모델 선택" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-sm font-semibold">수정 요청</CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={userPrompt}
            onChange={(event) => onUserPromptChange(event.target.value)}
            placeholder="선택 영역을 어떻게 바꿀지 적어주세요."
            className="min-h-[120px]"
          />
          <Button
            className="w-full"
            onClick={onRequestChange}
            disabled={isBusy || !!pendingChange}
          >
            AI 수정 요청
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-sm font-semibold">변경 사항</CardHeader>
        <CardContent>
          {pendingChange ? (
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">
                선택 영역 diff 미리보기
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onAcceptChange}>
                  적용
                </Button>
                <Button size="sm" variant="outline" onClick={onUndoChange}>
                  되돌리기
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              선택한 텍스트가 있으면 여기에 변경 사항이 나타납니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" />
        {status}
      </div>
    </aside>
  );
});
