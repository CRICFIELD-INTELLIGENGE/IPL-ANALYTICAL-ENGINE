// Mobile Dugout — your fan passport, franchise selection, and account workspace links.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useTeamTheme, TEAM_REGISTRY, TEAM_CODE_TO_SLUG, type TeamCode } from "@/lib/team-context";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

export default function MobileDugout() {
  const { theme, selectedTeam, setSelectedTeam } = useTeamTheme();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!supabaseConfigured) return;
    getSupabase().auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null)).catch(() => undefined);
  }, []);
  return (
    <div>
      <section className="mg-passport" style={theme ? { boxShadow: `inset 0 0 0 2px ${theme.accent}, 0 12px 30px rgba(0,0,0,0.4)` } : undefined}>
        <div className="crest">CRICFIELD · FAN PASSPORT</div>
        <h1>{email ? "Your Dugout" : "Guest pass"}</h1>
        <p style={{ margin: "0 0 14px", color: "#d9c39b", fontSize: 13.5 }}>{email ? `Signed in as ${email}` : "Sign in to keep your passport and saved items across devices."}</p>
        <Link href="/account" className="cfm-btn cfm-btn-gold">{email ? "Open profile" : "Sign in or join"}</Link>
      </section>

      <section className="mg-page" aria-labelledby="mg-team">
        <h2 id="mg-team">Your franchise</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13.5 }}>{theme ? `${theme.name} — ${theme.motto}` : "Pick a franchise to colour the app and personalise Home."}</p>
        <div className="mg-teams" role="group" aria-label="Favourite franchise">
          {(Object.keys(TEAM_REGISTRY) as TeamCode[]).map((c) => (
            <button key={c} type="button" aria-pressed={selectedTeam === c} aria-label={TEAM_REGISTRY[c].name} onClick={() => setSelectedTeam(selectedTeam === c ? null : c)}><img src={TEAM_REGISTRY[c].logoImg} alt="" /></button>
          ))}
        </div>
        {theme && <p style={{ margin: "12px 0 0" }}><Link href={`/dugout/${TEAM_CODE_TO_SLUG[theme.id]}`} style={{ fontWeight: 700, textDecoration: "underline" }}>Open the {theme.shortName} franchise hub →</Link></p>}
      </section>

      <ul className="mg-links">
        <li><Link href="/account"><span>Profile & fan story<small>Name, photo, favourite player and cricket memory</small></span><ChevronRight size={18} /></Link></li>
        <li><Link href="/account"><span>Saved items<small>Saved analyses and Retention Room picks</small></span><ChevronRight size={18} /></Link></li>
        <li><Link href="/account"><span>Notifications<small>Wickets, results and auction alerts you follow</small></span><ChevronRight size={18} /></Link></li>
      </ul>
    </div>
  );
}
