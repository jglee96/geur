import { useCallback, useRef } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  PromptAttachmentDraft,
  PromptAttachmentPayload,
  WorkspaceDroppedFile,
} from "@/shared/model";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
  SUPPORTED_TEXT_EXTENSIONS,
} from "./constants";
import {
  buildAttachmentStatusMessage,
  extractPromptTokens,
  getBasename,
  getExtension,
} from "./utils";

type UsePromptAttachmentsParams = {
  userPrompt: string;
  setUserPrompt: (value: string) => void;
  rootPath: string;
  onStatus: (message: string) => void;
};

export function usePromptAttachments({
  userPrompt,
  setUserPrompt,
  rootPath,
  onStatus,
}: UsePromptAttachmentsParams) {
  const attachmentsByTokenRef = useRef<Map<string, PromptAttachmentDraft>>(
    new Map(),
  );

  const handleUserPromptChange = useCallback(
    (value: string) => {
      setUserPrompt(value);
      const activeTokens = extractPromptTokens(value);
      for (const token of attachmentsByTokenRef.current.keys()) {
        if (!activeTokens.has(token)) {
          attachmentsByTokenRef.current.delete(token);
        }
      }
    },
    [setUserPrompt],
  );

  const createAttachmentToken = useCallback(
    (name: string) => {
      const existingTokens = new Set([
        ...attachmentsByTokenRef.current.keys(),
        ...Array.from(extractPromptTokens(userPrompt)),
      ]);
      let index = 1;
      while (true) {
        const suffix = index === 1 ? "" : `#${index}`;
        const token = `@첨부[${name}${suffix}]`;
        if (!existingTokens.has(token)) {
          return token;
        }
        index += 1;
      }
    },
    [userPrompt],
  );

  const pushAttachments = useCallback(
    (drafts: Array<Omit<PromptAttachmentDraft, "token">>) => {
      if (drafts.length === 0) return [];
      const allowedCount = Math.max(
        0,
        MAX_ATTACHMENT_COUNT - attachmentsByTokenRef.current.size,
      );
      const accepted = drafts.slice(0, allowedCount);
      const tokens: string[] = [];

      for (const draft of accepted) {
        const token = createAttachmentToken(draft.name);
        attachmentsByTokenRef.current.set(token, { ...draft, token });
        tokens.push(token);
      }
      return tokens;
    },
    [createAttachmentToken],
  );

  const buildPayload = useCallback((): PromptAttachmentPayload[] => {
    const usedTokens = extractPromptTokens(userPrompt);
    return Array.from(attachmentsByTokenRef.current.values())
      .filter((item) => usedTokens.has(item.token))
      .map(({ token, name, content, source }) => ({
        token,
        name,
        content,
        source,
      }));
  }, [userPrompt]);

  const attachExternalFiles = useCallback(
    async (files: File[]) => {
      const drafts: Array<Omit<PromptAttachmentDraft, "token">> = [];
      let skippedInvalid = 0;
      let skippedSize = 0;
      let skippedRead = 0;

      for (const file of files) {
        const ext = getExtension(file.name);
        if (!SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
          skippedInvalid += 1;
          continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          skippedSize += 1;
          continue;
        }
        try {
          const content = await file.text();
          if (content.includes("\u0000")) {
            skippedInvalid += 1;
            continue;
          }
          drafts.push({
            name: file.name,
            content,
            source: "external",
            size: file.size,
          });
        } catch {
          skippedRead += 1;
        }
      }

      const tokens = pushAttachments(drafts);
      const skippedByLimit = Math.max(0, drafts.length - tokens.length);
      onStatus(
        buildAttachmentStatusMessage(
          "첨부 추가",
          tokens.length,
          skippedInvalid,
          skippedSize,
          skippedRead,
          skippedByLimit,
        ),
      );
      return tokens;
    },
    [onStatus, pushAttachments],
  );

  const attachExternalPaths = useCallback(
    async (paths: string[]) => {
      const drafts: Array<Omit<PromptAttachmentDraft, "token">> = [];
      let skippedInvalid = 0;
      let skippedSize = 0;
      let skippedRead = 0;

      for (const path of paths) {
        const name = getBasename(path);
        const ext = getExtension(name);
        if (!SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
          skippedInvalid += 1;
          continue;
        }
        try {
          const content = await readTextFile(path);
          const size = new Blob([content]).size;
          if (size > MAX_ATTACHMENT_BYTES || content.includes("\u0000")) {
            skippedSize += 1;
            continue;
          }
          drafts.push({
            name,
            content,
            source: "external",
            size,
          });
        } catch {
          skippedRead += 1;
        }
      }

      const tokens = pushAttachments(drafts);
      const skippedByLimit = Math.max(0, drafts.length - tokens.length);
      onStatus(
        buildAttachmentStatusMessage(
          "외부 경로 첨부",
          tokens.length,
          skippedInvalid,
          skippedSize,
          skippedRead,
          skippedByLimit,
        ),
      );
      return tokens;
    },
    [onStatus, pushAttachments],
  );

  const attachWorkspaceFiles = useCallback(
    async (files: WorkspaceDroppedFile[]) => {
      if (!rootPath) {
        onStatus("폴더를 먼저 열어야 파일 첨부를 사용할 수 있어요.");
        return [];
      }

      const drafts: Array<Omit<PromptAttachmentDraft, "token">> = [];
      let skippedInvalid = 0;
      let skippedSize = 0;
      let skippedRead = 0;

      for (const file of files) {
        const ext = getExtension(file.name);
        if (!SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
          skippedInvalid += 1;
          continue;
        }
        const relativePath = file.path.replace(/^\/+/, "");
        const fullPath = `${rootPath}/${relativePath}`;
        try {
          const content = await readTextFile(fullPath);
          const size = new Blob([content]).size;
          if (size > MAX_ATTACHMENT_BYTES || content.includes("\u0000")) {
            skippedSize += 1;
            continue;
          }
          drafts.push({
            name: getBasename(file.name),
            content,
            source: "workspace",
            size,
          });
        } catch {
          skippedRead += 1;
        }
      }

      const tokens = pushAttachments(drafts);
      const skippedByLimit = Math.max(0, drafts.length - tokens.length);
      onStatus(
        buildAttachmentStatusMessage(
          "워크스페이스 첨부",
          tokens.length,
          skippedInvalid,
          skippedSize,
          skippedRead,
          skippedByLimit,
        ),
      );
      return tokens;
    },
    [onStatus, pushAttachments, rootPath],
  );

  return {
    handleUserPromptChange,
    buildPayload,
    attachExternalFiles,
    attachExternalPaths,
    attachWorkspaceFiles,
  };
}
