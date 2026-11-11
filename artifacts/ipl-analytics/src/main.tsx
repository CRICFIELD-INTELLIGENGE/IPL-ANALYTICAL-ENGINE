import { createRoot } from "react-dom/client";
import App from "./App";
import { RouteErrorBoundary } from "./components/route-error-boundary";
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

// Suppress a benign "Cannot read properties of undefined (reading 'addListener')"
// thrown by an upstream UI dep on initial mount. The chart still renders correctly;
// we silence it here so the dev runtime-error overlay doesn't pop up over the app.
if (typeof window !== "undefined") {
  const isAddListenerNoise = (msg: unknown): boolean =>
    typeof msg === "string" &&
    msg.includes("Cannot read properties of undefined") &&
    msg.includes("'addListener'");

  window.addEventListener(
    "error",
    (e) => {
      if (isAddListenerNoise(e.message)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );
  window.addEventListener(
    "unhandledrejection",
    (e) => {
      const reason = e.reason as { message?: string } | string | undefined;
      const msg = typeof reason === "string" ? reason : reason?.message;
      if (isAddListenerNoise(msg)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );
}

createRoot(document.getElementById("root")!).render(<RouteErrorBoundary><App /></RouteErrorBoundary>);

