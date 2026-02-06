import React, { useMemo, useState } from "react";
import { FileNode } from "@/shared/model";
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
  toggle,
  onSelectFile,
  onOpenFile,
  onRenamePath,
  onDeletePath,
}: {
  node: FileNode;
  level: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
  onSelectFile: (path: string) => void;
  onOpenFile: (path: string) => void;
  onRenamePath: (path: string) => void;
  onDeletePath: (path: string) => void;
}) {
  const hasChildren = node.isDir && node.children && node.children.length > 0;
  const isOpen = expanded.has(node.path);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 text-xs text-foreground"
        style={{ paddingLeft: level * INDENT }}
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
          className="flex-1 truncate text-left hover:text-foreground"
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
    <div className="flex h-full flex-col gap-3">
      <div className="text-xs font-semibold text-muted-foreground">로컬 폴더</div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onOpenFolder}>
          폴더 열기
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleCreate("folder")}>
          새 폴더
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleCreate("file")}>
          새 파일
        </Button>
      </div>
      <Input
        value={rootPath || "선택된 폴더 없음"}
        readOnly
        className="h-8 text-xs"
      />
      <Separator />
      <div className="min-h-0 flex-1 overflow-auto">
        {treeRoot ? (
          <div className="space-y-0.5">
          <TreeItem
            node={treeRoot}
            level={0}
            expanded={expanded}
            toggle={toggle}
            onSelectFile={onSelectFile}
            onOpenFile={onOpenFile}
            onRenamePath={handleRename}
            onDeletePath={onDeletePath}
          />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted p-3 text-xs text-muted-foreground">
            폴더를 선택하면 파일 트리를 보여줄게요.
          </div>
        )}
      </div>
      {selectedPath ? (
        <div className="text-[11px] text-muted-foreground">
          선택됨: {selectedPath}
        </div>
      ) : null}
    </div>
  );
}
