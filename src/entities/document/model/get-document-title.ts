export function getDocumentTitle(docText: string, filePath: string) {
  const heading = docText
    .split("\n")
    .find((line) => line.trim().startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim();

  if (heading) return heading;

  if (filePath) {
    const fileName = filePath.split("/").pop() ?? "";
    return fileName.replace(/\.(md|markdown|mdx)$/i, "");
  }

  return "새 문서";
}
