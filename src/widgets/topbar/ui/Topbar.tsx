import React, { memo } from "react";
import {
  Button,
  Separator,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";

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
    <header className="border-b bg-background">
      <div className="flex flex-wrap items-center gap-4 px-6 py-3">
        <Tabs defaultValue="home">
          <TabsList>
            <TabsTrigger value="home">홈</TabsTrigger>
            <TabsTrigger value="insert">삽입</TabsTrigger>
            <TabsTrigger value="view">보기</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto text-xs text-muted-foreground">
          {filePath ? filePath : "새 문서"}
        </div>
      </div>
      <Separator />
      <div className="flex flex-wrap items-center gap-4 px-6 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          폴더
          <Switch checked={isLeftOpen} onCheckedChange={onToggleLeft} />
        </div>
        <div className="flex items-center gap-2">
          AI 패널
          <Switch checked={isAiOpen} onCheckedChange={onToggleAi} />
        </div>
        <Separator orientation="vertical" className="h-5" />
        <Button size="sm" variant="outline" onClick={onOpen}>
          열기
        </Button>
        <Button size="sm" onClick={onSave}>
          저장
        </Button>
      </div>
    </header>
  );
});
