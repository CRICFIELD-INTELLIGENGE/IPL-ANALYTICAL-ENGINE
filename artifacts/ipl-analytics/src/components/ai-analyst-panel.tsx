import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send } from "lucide-react";

const SUGGESTED = [
  "Why CSK wins more while chasing?",
  "Show me top death over batsmen",
  "Which venue is best for spinners?",
  "Compare MI vs CSK in playoffs",
];

const CANNED: Record<string, string> = {
  csk: "CSK's chase success rate (62%) is driven by Dhoni-era stable middle order and disciplined death bowling. Average successful chase: 168 runs. Spin-friendly Chepauk inflates this further.",
  death: "Top death-over batsmen by SR (16-20 overs, last 5 seasons): 1) Suryakumar Yadav 196.3, 2) Glenn Maxwell 188.7, 3) Andre Russell 184.2, 4) Dinesh Karthik 181.5, 5) Hardik Pandya 178.9.",
  spin: "Best spin venues by economy: Chepauk (6.84), Eden Gardens (7.12), Wankhede (7.45). Worst: M. Chinnaswamy (8.91), Narendra Modi Stadium (8.62).",
  mi: "MI vs CSK in playoffs: 12 matches, MI leads 8-4. MI averages 178 vs CSK averages 165 in knockouts. Both have 4 of last 14 titles between them.",
};

function answer(q: string) {
  const k = q.toLowerCase();
  if (k.includes("csk") && k.includes("chas")) return CANNED.csk;
  if (k.includes("death")) return CANNED.death;
  if (k.includes("spin") || k.includes("venue")) return CANNED.spin;
  if (k.includes("mi") && k.includes("csk")) return CANNED.mi;
  return "I've routed your query to the analytics engine. In production this taps the IPL data warehouse and an LLM analyst — try one of the suggested prompts to see a sample response.";
}

export function AIAnalystPanel() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi Srihari, what would you like to analyze today?" },
  ]);
  const [input, setInput] = useState("");

  function send(q: string) {
    if (!q.trim()) return;
    const next = [...messages, { role: "user" as const, text: q }];
    setMessages(next);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai" as const, text: answer(q) }]);
    }, 350);
  }

  return (
    <div className="glass rounded-xl p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
            <span className="absolute inset-0 rounded-xl ring-1 ring-primary/40 animate-pulse" />
          </div>
          <div className="font-display font-semibold">AI ANALYST</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          Online
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm leading-snug rounded-xl px-3 py-2 max-w-[92%] ${
                m.role === "ai"
                  ? "bg-white/5 border border-white/10 text-foreground self-start"
                  : "bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/40 text-white self-end ml-auto"
              }`}
            >
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-1 mt-2">
        {SUGGESTED.slice(0, 3).map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-left text-[11px] px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors truncate"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mt-3 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-primary/60 transition-colors"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about IPL..."
          className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
        />
        <button type="submit" className="w-8 h-8 rounded-lg neon-btn flex items-center justify-center">
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
