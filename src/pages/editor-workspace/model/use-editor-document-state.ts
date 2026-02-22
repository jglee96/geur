import { useCallback, useState } from "react";
import { DEFAULT_DOC } from "@/shared/config";

export function useEditorDocumentState() {
  const [docText, setDocText] = useState(DEFAULT_DOC);
  const [docExternalVersion, setDocExternalVersion] = useState(0);
  const [filePath, setFilePath] = useState("");

  const applyExternalDocChange = useCallback((value: string) => {
    setDocText(value);
    setDocExternalVersion((prev) => prev + 1);
  }, []);

  const handleDocChange = useCallback((value: string) => {
    setDocText(value);
  }, []);

  return {
    docText,
    docExternalVersion,
    filePath,
    setFilePath,
    applyExternalDocChange,
    handleDocChange,
  };
}
