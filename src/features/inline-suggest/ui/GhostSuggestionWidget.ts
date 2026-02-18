import { WidgetType } from "@codemirror/view";

export class GhostSuggestionWidget extends WidgetType {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ghost-suggestion";
    span.setAttribute("aria-hidden", "true");
    span.textContent = this.text;
    return span;
  }

  ignoreEvent() {
    return true;
  }
}
