import React from "react";
import ReactDOM from "react-dom/client";
import {App} from "./App";
import "./styles.css";

window.addEventListener("error", (event) => {
  window.motioner?.reportRendererError({
    message: event.message || "Renderer 未知错误",
    stack: event.error instanceof Error ? event.error.stack : undefined,
    source: event.filename || "renderer",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason));
  window.motioner?.reportRendererError({
    message: error.message,
    stack: error.stack,
    source: "renderer-promise",
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
