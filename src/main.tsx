import ReactDOM from "react-dom/client";
import { App } from "@/app/App";
import React from "react";
import "pretendard/dist/web/static/pretendard.css";
import "./App.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
