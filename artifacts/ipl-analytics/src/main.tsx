import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Polyfill legacy MediaQueryList.addListener/removeListener for libs that still call them.
if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const mql = window.matchMedia("(min-width: 0px)");
  const proto = Object.getPrototypeOf(mql);
  if (proto && typeof proto.addListener !== "function") {
    proto.addListener = function (cb: (e: MediaQueryListEvent) => void) {
      this.addEventListener("change", cb);
    };
    proto.removeListener = function (cb: (e: MediaQueryListEvent) => void) {
      this.removeEventListener("change", cb);
    };
  }
}

createRoot(document.getElementById("root")!).render(<App />);
