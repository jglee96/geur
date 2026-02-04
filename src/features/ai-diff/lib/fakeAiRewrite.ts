export function fakeAiRewrite(text: string, instruction: string) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const lines = trimmed.split("\n");
  const tightened = lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n");

  let result = tightened
    .replaceAll("그리고", "또한")
    .replaceAll("하지만", "다만")
    .replaceAll("필요하다", "필요합니다");

  if (!/[.!?]$/.test(result)) {
    result += ".";
  }

  return result;
}
