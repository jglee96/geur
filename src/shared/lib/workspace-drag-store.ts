import type { WorkspaceDroppedFile } from "@/shared/model";

let currentWorkspaceDrag: WorkspaceDroppedFile[] = [];

export function setWorkspaceDrag(files: WorkspaceDroppedFile[]) {
  currentWorkspaceDrag = files;
}

export function getWorkspaceDrag() {
  return currentWorkspaceDrag;
}

export function clearWorkspaceDrag() {
  currentWorkspaceDrag = [];
}
