import { WidgetType } from "@codemirror/view";

export class DiffWidget extends WidgetType {
  html: string;

  constructor(html: string) {
    super();
    this.html = html;
  }

  toDOM() {
    const container = document.createElement("span");
    container.className = "diff-preview";
    container.innerHTML = this.html;
    return container;
  }

  ignoreEvent() {
    return true;
  }
}
