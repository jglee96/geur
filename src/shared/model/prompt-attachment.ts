export type PromptAttachmentSource = "external" | "workspace";

export type PromptAttachmentDraft = {
  token: string;
  name: string;
  content: string;
  source: PromptAttachmentSource;
  size: number;
};

export type PromptAttachmentPayload = {
  token: string;
  name: string;
  content: string;
  source: PromptAttachmentSource;
};

export type WorkspaceDroppedFile = {
  path: string;
  name: string;
};
