import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={toggleTheme}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        title={`Current: ${resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"} (Click to switch)`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {resolvedTheme === "dark" ? (
            <motion.div
              key="moon"
              initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="w-4 h-4 text-amber-300" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0.5, rotate: 45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: -45, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="w-4 h-4 text-amber-600" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}

export function ThemeSegmentedToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#0B1020] text-xs ${className}`}>
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
          theme === "light"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
        }`}
        title="Light Mode"
        aria-label="Light Mode"
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
          theme === "dark"
            ? "bg-slate-800 dark:bg-white/15 text-white shadow-sm"
            : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
        }`}
        title="Dark Mode"
        aria-label="Dark Mode"
      >
        <Moon className="w-3.5 h-3.5 text-indigo-400" />
        <span className="hidden sm:inline">Dark</span>
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
          theme === "system"
            ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
        }`}
        title="System Preference"
        aria-label="System Preference"
      >
        <Monitor className="w-3.5 h-3.5 text-slate-400" />
        <span className="hidden sm:inline">Auto</span>
      </button>
    </div>
  );
}
