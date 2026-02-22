import { useCallback, useEffect, useState } from "react";
import { useThemeMode } from "@/features/theme";

type UseEditorWorkspaceTopbarParams = {
  onStatus: (message: string) => void;
};

export function useEditorWorkspaceTopbar({
  onStatus,
}: UseEditorWorkspaceTopbarParams) {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const { themeMode, setThemeMode } = useThemeMode();

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    if (!storedKey) return;
    setApiKey(storedKey);
  }, []);

  const handleToggleAi = useCallback(() => {
    setIsAiOpen((prev) => !prev);
  }, []);

  const handleToggleLeft = useCallback(() => {
    setIsLeftOpen((prev) => !prev);
  }, []);

  const handleSaveApiKey = useCallback(
    (value: string) => {
      setApiKey(value);
      localStorage.setItem("openai_api_key", value);
      onStatus("API 키가 저장되었습니다.");
    },
    [onStatus],
  );

  return {
    isAiOpen,
    isLeftOpen,
    apiKey,
    themeMode,
    setThemeMode,
    handleToggleAi,
    handleToggleLeft,
    handleSaveApiKey,
  };
}
