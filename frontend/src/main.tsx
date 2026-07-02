import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { bootstrapTheme } from "./stores/theme";
import "./index.css";

// Apply the persisted/system theme before first paint to avoid a flash.
bootstrapTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
