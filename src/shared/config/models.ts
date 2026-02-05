export type ModelOption = {
  id: string;
  label: string;
};

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "gpt-5.2", label: "GPT-5.2 (Thinking)" },
  { id: "gpt-5.2-pro", label: "GPT-5.2 Pro" },
  { id: "gpt-5.2-chat-latest", label: "GPT-5.2 Instant (Chat Latest)" },
  { id: "gpt-5.2-codex", label: "GPT-5.2 Codex" },
  { id: "gpt-5-mini", label: "GPT-5 mini" },
  { id: "gpt-5-nano", label: "GPT-5 nano" },
];
