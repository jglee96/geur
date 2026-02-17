import { useCallback } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

type ToastPush = (toast: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

type UseDocumentIoParams = {
  docText: string;
  filePath: string;
  rootPath: string;
  onDocTextChange: (value: string) => void;
  onFilePathChange: (value: string) => void;
  onStatus: (value: string) => void;
  onSelectPath: (relativePath: string) => void;
  pushToast: ToastPush;
};

export function useDocumentIo({
  docText,
  filePath,
  rootPath,
  onDocTextChange,
  onFilePathChange,
  onStatus,
  onSelectPath,
  pushToast,
}: UseDocumentIoParams) {
  const handleOpen = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) return;
      const content = await readTextFile(path);
      onDocTextChange(content);
      onFilePathChange(path);
      onStatus(`열기 완료: ${path}`);
    } catch (error) {
      onStatus("파일 열기에 실패했어요.");
      console.error(error);
    }
  }, [onDocTextChange, onFilePathChange, onStatus]);

  const handleSave = useCallback(async () => {
    try {
      let path = filePath;
      if (!path) {
        path = await save({
          defaultPath: "untitled.md",
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
      }
      if (!path) return;
      await writeTextFile(path, docText);
      onFilePathChange(path);
      onStatus(`저장 완료: ${path}`);
    } catch (error) {
      onStatus("파일 저장에 실패했어요.");
      console.error(error);
    }
  }, [docText, filePath, onFilePathChange, onStatus]);

  const openMarkdownFile = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      const lower = relativePath.toLowerCase();
      if (!lower.endsWith(".md") && !lower.endsWith(".mdx")) {
        pushToast({
          title: "열 수 없는 파일",
          description: "마크다운(.md, .mdx) 파일만 열 수 있어요.",
          variant: "destructive",
        });
        return;
      }
      const fullPath = `${rootPath}/${relativePath}`;
      const content = await readTextFile(fullPath);
      onDocTextChange(content);
      onFilePathChange(fullPath);
      onSelectPath(relativePath);
      onStatus(`열기 완료: ${fullPath}`);
    },
    [onDocTextChange, onFilePathChange, onSelectPath, onStatus, pushToast, rootPath],
  );

  return {
    handleOpen,
    handleSave,
    openMarkdownFile,
  };
}
