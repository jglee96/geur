import React, { useMemo, useState } from "react";
import { FileNode } from "@/shared/model";
import {
  WORKSPACE_ATTACHMENT_MIME,
  WORKSPACE_ATTACHMENT_TEXT_PREFIX,
} from "@/shared/config";
import { setWorkspaceDrag } from "@/shared/lib/workspace-drag-store";
import { Button, Input, Separator } from "@/shared/ui";

const INDENT = 12;

type FileTreePanelProps = {
  rootPath: string;
  tree: FileNode | null;
  selectedPath: string;
  onOpenFolder: () => void;
  onSelectFile: (path: string) => void;
  onOpenFile: (path: string) => void;
  onCreateFile: (relativePath: string) => void;
  onCreateFolder: (relativePath: string) => void;
  onRenamePath: (relativePath: string) => void;
  onDeletePath: (relativePath: string) => void;
};

function TreeItem({
  node,
  level,
  expanded,
  selectedPath,
  toggle,
  onSelectFile,
  onOpenFile,
  onRenamePath,
  onDeletePath,
}: {
  node: FileNode;
  level: number;
  expanded: Set<string>;
  selectedPath: string;
  toggle: (path: string) => void;
  onSelectFile: (path: string) => void;
  onOpenFile: (path: string) => void;
  onRenamePath: (path: string) => void;
  onDeletePath: (path: string) => void;
}) {
  const hasChildren = node.isDir && node.children && node.children.length > 0;
  const isOpen = expanded.has(node.path);
  const isSelected = !node.isDir && selectedPath === node.path;
  const dragPayload = JSON.stringify({ path: node.path, name: node.name });

  const handleDragStart = (event: React.DragEvent<HTMLElement>) => {
    if (node.isDir) return;
    setWorkspaceDrag([{ path: node.path, name: node.name }]);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(WORKSPACE_ATTACHMENT_MIME, dragPayload);
    event.dataTransfer.setData(
      "text/plain",
      `${WORKSPACE_ATTACHMENT_TEXT_PREFIX}${dragPayload}`,
    );
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 rounded-md py-0.5 text-xs text-foreground hover:bg-accent/60"
        style={{ paddingLeft: level * INDENT }}
        draggable={!node.isDir}
        onDragStart={handleDragStart}
      >
        {node.isDir ? (
          <button
            type="button"
            onClick={() => toggle(node.path)}
            className="w-4 text-xs text-muted-foreground"
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button
          type="button"
          onClick={() => (node.isDir ? toggle(node.path) : onSelectFile(node.path))}
          onDoubleClick={() =>
            node.isDir ? toggle(node.path) : onOpenFile(node.path)
          }
          onMouseDown={() => {
            if (node.isDir) return;
            setWorkspaceDrag([{ path: node.path, name: node.name }]);
          }}
          onPointerDown={() => {
            if (node.isDir) return;
            setWorkspaceDrag([{ path: node.path, name: node.name }]);
          }}
          draggable={!node.isDir}
          onDragStart={handleDragStart}
          className={`flex-1 truncate rounded-[5px] px-1.5 py-0.5 text-left ${
            isSelected
              ? "bg-primary/15 text-foreground"
              : "text-foreground/90 hover:text-foreground"
          }`}
        >
          {node.name}
        </button>
        <button
          type="button"
          className="px-1 text-muted-foreground hover:text-foreground"
          onClick={() => onRenamePath(node.path)}
        >
          ✎
        </button>
        <button
          type="button"
          className="px-1 text-muted-foreground hover:text-destructive"
          onClick={() => onDeletePath(node.path)}
        >
          ×
        </button>
      </div>
      {node.isDir && isOpen && hasChildren ? (
        <div>
          {node.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              expanded={expanded}
              selectedPath={selectedPath}
              toggle={toggle}
              onSelectFile={onSelectFile}
              onOpenFile={onOpenFile}
              onRenamePath={onRenamePath}
              onDeletePath={onDeletePath}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FileTreePanel({
  rootPath,
  tree,
  selectedPath,
  onOpenFolder,
  onSelectFile,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRenamePath,
  onDeletePath,
}: FileTreePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["/"]));

  const treeRoot = useMemo(() => tree, [tree]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreate = (type: "file" | "folder") => {
    if (!rootPath) return;
    const name = window.prompt(
      type === "file" ? "새 파일 이름" : "새 폴더 이름",
    );
    if (!name) return;
    if (type === "file") {
      onCreateFile(name);
    } else {
      onCreateFolder(name);
    }
  };

  const handleRename = (path: string) => {
    const name = window.prompt("새 이름", path.split("/").pop() || "");
    if (!name) return;
    const parts = path.split("/");
    parts.pop();
    const base = parts.join("/");
    const nextPath = base ? `${base}/${name}` : name;
    onRenamePath(`${path}::${nextPath}`);
  };

  return (
    <div className="flex h-full flex-col gap-2 rounded-xl bg-background/55 p-2">
      <div className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        로컬 폴더
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <Button size="sm" variant="outline" className="h-7 rounded-md" onClick={onOpenFolder}>
          폴더 열기
        </Button>
        <Button size="sm" variant="ghost" className="h-7 rounded-md" onClick={() => handleCreate("folder")}>
          새 폴더
        </Button>
        <Button size="sm" variant="ghost" className="h-7 rounded-md" onClick={() => handleCreate("file")}>
          새 파일
        </Button>
      </div>
      <Input
        value={rootPath || "선택된 폴더 없음"}
        readOnly
        className="h-8 rounded-md bg-background/80 text-xs"
      />
      <Separator />
      <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-background/70 p-1.5">
        {treeRoot ? (
          <div className="space-y-0.5">
            <TreeItem
              node={treeRoot}
              level={0}
              expanded={expanded}
              selectedPath={selectedPath}
              toggle={toggle}
              onSelectFile={onSelectFile}
              onOpenFile={onOpenFile}
              onRenamePath={handleRename}
              onDeletePath={onDeletePath}
            />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-background/80 p-3 text-xs text-muted-foreground">
            폴더를 선택하면 파일 트리를 보여줄게요.
          </div>
        )}
      </div>
      {selectedPath ? (
        <div className="px-1 pb-1 text-[10px] text-muted-foreground">
          선택됨: {selectedPath}
        </div>
      ) : null}
    </div>
  );
}
