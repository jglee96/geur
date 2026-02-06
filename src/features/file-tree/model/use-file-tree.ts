import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FileNode } from "@/shared/model";

type UseFileTreeParams = {
  onStatus: (message: string) => void;
};

type UseFileTreeResult = {
  rootPath: string;
  tree: FileNode | null;
  selectedPath: string;
  openFolder: () => Promise<void>;
  selectPath: (relativePath: string) => void;
  createFile: (relativePath: string) => Promise<void>;
  createFolder: (relativePath: string) => Promise<void>;
  renamePath: (payload: string) => Promise<void>;
  deletePath: (relativePath: string) => Promise<void>;
  refreshTree: (nextRoot?: string) => Promise<void>;
};

function formatError(error: unknown) {
  return typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : JSON.stringify(error);
}

export function useFileTree({ onStatus }: UseFileTreeParams): UseFileTreeResult {
  const [rootPath, setRootPath] = useState("");
  const [tree, setTree] = useState<FileNode | null>(null);
  const [selectedPath, setSelectedPath] = useState("");

  const refreshTree = useCallback(
    async (nextRoot?: string) => {
      const root = nextRoot ?? rootPath;
      if (!root) return;
      const nextTree = await invoke<FileNode>("list_tree", { rootPath: root });
      setTree(nextTree);
    },
    [rootPath],
  );

  const openFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    setRootPath(path);
    setSelectedPath("");
    await refreshTree(path);
  }, [refreshTree]);

  const selectPath = useCallback((relativePath: string) => {
    setSelectedPath(relativePath);
  }, []);

  const createFile = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      try {
        await invoke("create_file", { rootPath, relativePath });
        onStatus(`파일 생성: ${relativePath}`);
        await refreshTree();
      } catch (error) {
        onStatus(`파일 생성 실패: ${formatError(error)}`);
      }
    },
    [onStatus, refreshTree, rootPath],
  );

  const createFolder = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      try {
        await invoke("create_folder", { rootPath, relativePath });
        onStatus(`폴더 생성: ${relativePath}`);
        await refreshTree();
      } catch (error) {
        onStatus(`폴더 생성 실패: ${formatError(error)}`);
      }
    },
    [onStatus, refreshTree, rootPath],
  );

  const renamePath = useCallback(
    async (payload: string) => {
      if (!rootPath) return;
      const [from, to] = payload.split("::");
      if (!from || !to) return;
      try {
        await invoke("rename_path", { rootPath, from, to });
        onStatus(`이름 변경: ${from} → ${to}`);
        await refreshTree();
      } catch (error) {
        onStatus(`이름 변경 실패: ${formatError(error)}`);
      }
    },
    [onStatus, refreshTree, rootPath],
  );

  const deletePath = useCallback(
    async (relativePath: string) => {
      if (!rootPath) return;
      const confirmed = window.confirm(`삭제할까요? ${relativePath}`);
      if (!confirmed) return;
      try {
        await invoke("delete_path", { rootPath, relativePath });
        onStatus(`삭제 완료: ${relativePath}`);
        await refreshTree();
      } catch (error) {
        onStatus(`삭제 실패: ${formatError(error)}`);
      }
    },
    [onStatus, refreshTree, rootPath],
  );

  return {
    rootPath,
    tree,
    selectedPath,
    openFolder,
    selectPath,
    createFile,
    createFolder,
    renamePath,
    deletePath,
    refreshTree,
  };
}
