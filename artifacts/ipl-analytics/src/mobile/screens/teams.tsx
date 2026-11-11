// Mobile Teams — ten franchise banners, each in its own colour with its title count.
import { Link } from "wouter";
import { TEAM_REGISTRY, TEAM_CODE_TO_SLUG, type TeamCode } from "@/lib/team-context";

export default function MobileTeams() {
  return (
    <section className="cfm-section">
      <div className="cfm-kicker">Ten franchises</div>
      <h1 className="cfm-h1" style={{ fontSize: 44 }}>The team universe</h1>
      <div className="mt-grid">
        {(Object.keys(TEAM_REGISTRY) as TeamCode[]).map((c) => { const t = TEAM_REGISTRY[c]; return (
          <Link key={c} href={`/teams/${TEAM_CODE_TO_SLUG[c]}`} style={{ ["--c" as string]: t.accent }}>
            <img src={t.logoImg} alt="" style={{ width: 34, height: 34, borderRadius: "50%", background: "#fff", objectFit: "contain", padding: 2 }} />
            <strong>{t.shortName}</strong>
            <span>{t.city} · {t.titles ? `${t.titles} title${t.titles > 1 ? "s" : ""}` : "no titles yet"}</span>
          </Link>
        ); })}
      </div>
    </section>
  );
}
