import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Set dark mode class on html element
document.documentElement.classList.add("dark");

// Wire up auth token from localStorage for all API calls
setAuthTokenGetter(() => localStorage.getItem("bidwrenx_token"));

createRoot(document.getElementById("root")!).render(<App />);
