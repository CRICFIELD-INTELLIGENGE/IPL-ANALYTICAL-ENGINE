// Floating CricField Assistant: one entry point to the website AI Analyst and,
// once Meta messaging is verified end to end, the official WhatsApp chat.
import { useState } from "react";
import { useLocation } from "wouter";
import { Bot, MessageCircle, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Set only after a real Meta round-trip succeeds; digits with country code, e.g. 919876543210.
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER ?? "").trim();
const whatsappHref = /^[0-9]{7,15}$/.test(WHATSAPP_NUMBER) ? `https://wa.me/${WHATSAPP_NUMBER}` : null;

// /account hosts the DRS login animation; /admin is internal.
const HIDDEN_PREFIXES = ["/account", "/admin"];

// embedded: rendered at the bottom of Layout's right rail. Otherwise floating; the floating one hides
// while a rail is mounted (Layout sets html[data-right-rail]) so a page never shows two.
export function AssistantLauncher({ embedded = false }: { embedded?: boolean }) {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  if (HIDDEN_PREFIXES.some((p) => location.startsWith(p))) return null;

  const action = "flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm";
  const button = "flex items-center justify-center rounded-full border border-primary/40 bg-[#0B1020] text-primary shadow-xl hover:bg-[#121a33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Open CricField Assistant"
        className={embedded
          ? `${button} h-10 w-10`
          // z above rails (20), below consent banner (200).
          : `${button} fixed z-30 h-14 w-14 [html[data-right-rail]_&]:hidden`}
        style={embedded ? undefined : { right: "calc(1.25rem + env(safe-area-inset-right))", bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <Bot className={embedded ? "h-5 w-5" : "h-6 w-6"} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent side={embedded ? "left" : "top"} align="end" sideOffset={10} className="z-30 w-72 rounded-2xl border-white/15 bg-[#0B1020] p-4 text-white">
        <h2 className="text-sm font-bold">CricField Assistant</h2>
        <p className="mb-3 text-xs text-white/60">Your cricket research companion.</p>
        <div className="space-y-2">
          <button
            type="button"
            className={`${action} hover:border-primary/50 hover:bg-white/5`}
            onClick={() => { setOpen(false); navigate("/ai-analyst"); }}
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-semibold">Ask CricField AI</span>
          </button>
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={`${action} hover:border-primary/50 hover:bg-white/5`} onClick={() => setOpen(false)}>
              <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-semibold">Chat on WhatsApp</span>
            </a>
          ) : (
            <div className={`${action} text-white/50`} aria-disabled="true">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span className="font-semibold">Chat on WhatsApp</span>
              <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">Soon</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
