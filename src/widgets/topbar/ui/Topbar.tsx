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
    <header className="border-b border-black/10 bg-white/75 backdrop-blur-xl">
      <div className="flex h-12 items-center gap-2 px-4">
        <div className="inline-flex items-center rounded-lg bg-zinc-100 p-1">
          <Button
            size="sm"
            variant={isLeftOpen ? "default" : "ghost"}
            className="h-7"
            onClick={onToggleLeft}
          >
            폴더
          </Button>
          <Button
            size="sm"
            variant={isAiOpen ? "default" : "ghost"}
            className="h-7"
            onClick={onToggleAi}
          >
            AI
          </Button>
        </div>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button size="sm" variant="ghost" className="h-7" onClick={onOpen}>
          열기
        </Button>
        <Button size="sm" className="h-7" onClick={onSave}>
          저장
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7">
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
        <div className="ml-auto max-w-[48vw] truncate text-xs text-zinc-500">
          {filePath ? filePath : "새 문서"}
        </div>
      </div>
    </header>
  );
});
