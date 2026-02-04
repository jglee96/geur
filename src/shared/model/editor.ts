export type SelectionState = {
  from: number;
  to: number;
  text: string;
};

export type PendingChange = {
  from: number;
  to: number;
  originalText: string;
  suggestedText: string;
};
