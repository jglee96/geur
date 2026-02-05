import React, { memo } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
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
  apiKey: string;
  onOpen: () => void;
  onSave: () => void;
  onToggleAi: () => void;
  onToggleLeft: () => void;
  onSaveApiKey: (value: string) => void;
};

export const Topbar = memo(function Topbar({
  filePath,
  isAiOpen,
  isLeftOpen,
  apiKey,
  onOpen,
  onSave,
  onToggleAi,
  onToggleLeft,
  onSaveApiKey,
}: TopbarProps) {
  const [draftKey, setDraftKey] = React.useState(apiKey);

  React.useEffect(() => {
    setDraftKey(apiKey);
  }, [apiKey]);
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
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              설정
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API 키 설정</DialogTitle>
              <DialogDescription>
                OpenAI API 키를 로컬에 저장합니다. 키는 이 기기에서만 사용됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={draftKey}
                onChange={(event) => setDraftKey(event.target.value)}
              />
              <div className="text-[11px] text-muted-foreground">
                저장 후 즉시 적용됩니다.
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <DialogClose asChild>
                <Button size="sm" variant="outline">
                  취소
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button size="sm" onClick={() => onSaveApiKey(draftKey.trim())}>
                  저장
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
});
