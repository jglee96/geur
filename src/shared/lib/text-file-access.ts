import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export function normalizeFilePath(rawPath: string) {
  if (!rawPath.startsWith("file://")) return rawPath;
  return decodeURIComponent(rawPath.replace("file://", ""));
}

export async function safeReadTextFile(rawPath: string) {
  const path = normalizeFilePath(rawPath);
  try {
    return await readTextFile(path);
  } catch {
    return await invoke<string>("read_text_file_any", { path });
  }
}

export async function safeWriteTextFile(rawPath: string, content: string) {
  const path = normalizeFilePath(rawPath);
  try {
    await writeTextFile(path, content);
    return;
  } catch {
    await invoke("write_text_file_any", { path, content });
  }
}
