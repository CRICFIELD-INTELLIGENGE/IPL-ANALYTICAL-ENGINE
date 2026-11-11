// Fan parliament: one poll for the franchise. Votes are kept per browser, and no
// community totals are shown because no shared poll service is connected. The
// evidence link goes to the analysis the poll question relates to.

import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { FAN_POLLS } from "@/lib/fan-polls";
import { isTeamCode, type TeamCode } from "@/lib/team-context";

const storageKey = (code: string) => `beyond_xi_poll_v2_${code}`;

function readVote(code: string): string | null {
  try {
    return localStorage.getItem(storageKey(code));
  } catch {
    return null;
  }
}

export function FanParliamentCard({ code, teamName, accent }: { code: string; teamName: string; accent: string }) {
  const poll = isTeamCode(code) ? FAN_POLLS[code as TeamCode] : undefined;
  const [vote, setVote] = useState<string | null>(() => readVote(code));

  if (!poll) return null;

  const castVote = (id: string) => {
    if (vote) return;
    setVote(id);
    try {
      localStorage.setItem(storageKey(code), id);
    } catch {
      // Storage is blocked: the vote is shown for this visit only.
    }
  };

  return (
    <section id="fan-zone" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-5 min-w-0">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
          <MessageSquare className="w-3.5 h-3.5" style={{ color: accent }} /> Fan parliament · {teamName}
          <span className="ml-auto rounded bg-white/10 px-1.5 py-px text-[9px] text-white/55">{poll.category}</span>
        </div>
        <h2 className="font-display font-black text-lg sm:text-xl text-white leading-snug">{poll.question}</h2>
      </header>

      <fieldset className="space-y-2">
        <legend className="sr-only">Your vote</legend>
        {poll.options.map((o) => {
          const picked = vote === o.id;
          return (
            <label
              key={o.id}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${
                picked ? "text-white" : vote ? "border-white/5 text-white/45" : "border-white/10 text-white/80 hover:border-white/25 hover:text-white"
              }`}
              style={picked ? { borderColor: accent, backgroundColor: `${accent}1a` } : undefined}
            >
              <input
                type="radio"
                name={`poll-${code}`}
                value={o.id}
                checked={picked}
                disabled={Boolean(vote)}
                onChange={() => castVote(o.id)}
                className="sr-only"
              />
              <span className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: picked ? accent : "rgba(255,255,255,0.25)" }}>
                {picked && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />}
              </span>
              <span className="text-sm">{o.text}</span>
              {picked && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: accent }} />}
            </label>
          );
        })}
      </fieldset>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-white/50">
          {vote
            ? "Your vote is saved in this browser. Community totals need a shared poll service, which is not connected yet."
            : "Pick one option. Your vote is saved in this browser."}
        </span>
        <Link href={`/ai-analyst/squad-dna?team=${encodeURIComponent(teamName)}`} className="font-bold text-white/70 hover:text-white underline underline-offset-4">
          See the analysis behind it →
        </Link>
      </footer>
    </section>
  );
}
