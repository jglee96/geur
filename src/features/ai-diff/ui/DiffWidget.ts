import { WidgetType } from "@codemirror/view";

export class DiffWidget extends WidgetType {
  html: string;

  constructor(html: string) {
    super();
    this.html = html;
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "ai-diff-widget my-1";
    container.setAttribute("data-ai-diff-widget", "true");
    container.innerHTML = this.html;
    return container;
  }

  ignoreEvent() {
    return true;
  }
}
