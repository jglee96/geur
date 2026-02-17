export function extractPromptTokens(prompt: string) {
  return new Set(prompt.match(/@첨부\[[^\]]+\]/g) ?? []);
}

export function getBasename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

export function getExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

export function buildAttachmentStatusMessage(
  prefix: string,
  attached: number,
  skippedInvalid: number,
  skippedSize: number,
  skippedRead: number,
  skippedByLimit: number,
) {
  return `${prefix}: ${attached}개${
    skippedInvalid ? `, 형식 제외 ${skippedInvalid}개` : ""
  }${skippedSize ? `, 용량 제외 ${skippedSize}개` : ""}${
    skippedRead ? `, 읽기 실패 ${skippedRead}개` : ""
  }${skippedByLimit ? `, 개수 제한 제외 ${skippedByLimit}개` : ""}`;
}
