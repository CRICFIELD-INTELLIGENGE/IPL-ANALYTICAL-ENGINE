import React, { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, type DarkPaletteId } from "@/lib/theme";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { darkPalette, setDarkPalette, palettes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activePalette = palettes.find((p) => p.id === darkPalette) || palettes[0];

  return (
    <div ref={dropdownRef} className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        aria-label="Select dark palette theme"
        title={`Dark Palette: ${activePalette.name} (Click to change)`}
      >
        <Palette className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: activePalette.dotColor }}
        />
        <span className="hidden sm:inline text-[11px] font-mono font-medium tracking-tight text-white/80">
          {activePalette.name.split(" ")[0]}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 p-1.5 rounded-2xl bg-[#0B1020]/95 backdrop-blur-xl border border-white/15 shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-2.5 py-1.5 border-b border-white/10 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 block">
                Dark Palettes
              </span>
            </div>

            <div className="space-y-0.5">
              {palettes.map((p) => {
                const isSelected = p.id === darkPalette;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDarkPalette(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/15 text-white font-semibold"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-white/20"
                        style={{ backgroundColor: p.dotColor }}
                      />
                      <div className="min-w-0">
                        <span className="text-xs block leading-tight truncate">{p.name}</span>
                        <span className="text-[9px] font-mono text-white/40 block leading-tight truncate">
                          {p.tagline}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThemeSegmentedToggle({ className = "" }: { className?: string }) {
  const { darkPalette, setDarkPalette, palettes } = useTheme();

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl border border-white/10 bg-[#0B1020] text-xs ${className}`}
    >
      {palettes.map((p) => {
        const isSelected = p.id === darkPalette;
        return (
          <button
            key={p.id}
            onClick={() => setDarkPalette(p.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              isSelected
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/40 hover:text-white"
            }`}
            title={`${p.name} - ${p.tagline}`}
            aria-label={p.name}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: p.dotColor }}
            />
            <span className="hidden sm:inline text-[10px] font-mono">{p.name.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
