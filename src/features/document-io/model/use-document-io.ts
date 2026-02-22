import { useCallback } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  normalizeFilePath,
  safeReadTextFile,
  safeWriteTextFile,
} from "@/shared/lib";

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
  onOpenSuccess?: (path: string) => void;
  onSaveSuccess?: (path: string) => void;
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
  onOpenSuccess,
  onSaveSuccess,
}: UseDocumentIoParams) {
  const handleOpen = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (!selected) return;
      const path = normalizeFilePath(Array.isArray(selected) ? selected[0] : selected);
      if (!path) return;
      const content = await safeReadTextFile(path);
      onDocTextChange(content);
      onFilePathChange(path);
      onStatus(`열기 완료: ${path}`);
      onOpenSuccess?.(path);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onStatus(`파일 열기에 실패했어요: ${message}`);
      console.error(error);
    }
  }, [onDocTextChange, onFilePathChange, onOpenSuccess, onStatus]);

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
      const normalizedPath = normalizeFilePath(path);
      await safeWriteTextFile(normalizedPath, docText);
      onFilePathChange(normalizedPath);
      onStatus(`저장 완료: ${normalizedPath}`);
      onSaveSuccess?.(normalizedPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onStatus(`파일 저장에 실패했어요: ${message}`);
      console.error(error);
    }
  }, [docText, filePath, onFilePathChange, onSaveSuccess, onStatus]);

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
      const content = await safeReadTextFile(fullPath);
      onDocTextChange(content);
      onFilePathChange(fullPath);
      onSelectPath(relativePath);
      onStatus(`열기 완료: ${fullPath}`);
      onOpenSuccess?.(fullPath);
    },
    [
      onDocTextChange,
      onFilePathChange,
      onSelectPath,
      onStatus,
      pushToast,
      rootPath,
      safeReadText,
      onOpenSuccess,
    ],
  );

  return {
    handleOpen,
    handleSave,
    openMarkdownFile,
  };
}
