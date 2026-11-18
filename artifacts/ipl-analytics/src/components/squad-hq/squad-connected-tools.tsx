import { Link } from "wouter";
import { ArrowRight, BookOpen, Gauge, Gavel, Shield, Swords } from "lucide-react";
import { TEAM_CODE_TO_SLUG, type TeamCode } from "@/lib/team-context";

export function SquadConnectedTools({ team }: { team: TeamCode }) {
  const slug = TEAM_CODE_TO_SLUG[team];
  const links = [
    {
      title: "Auction Room",
      desc: "Explore player choices, targets, recruitment alternatives and official purchases.",
      href: `/auction?team=${team}`,
      icon: Gavel,
      tone: "text-purple-300 bg-purple-500/15 border-purple-400/25",
    },
    {
      title: "Match Lab",
      desc: "Test selected squad combinations against opponents and venues.",
      href: `/tactics?team=${team}`,
      icon: Swords,
      tone: "text-sky-300 bg-sky-500/15 border-sky-400/25",
    },
    {
      title: "Pressure Lab",
      desc: "Inspect player performance under pressure and clutch splits.",
      href: `/pressurelab?team=${team}`,
      icon: Gauge,
      tone: "text-amber-300 bg-amber-500/15 border-amber-400/25",
    },
    {
      title: "Editorials",
      desc: "Read squad-building, auction and franchise analysis.",
      href: `/editorials?franchise=${team.toLowerCase()}`,
      icon: BookOpen,
      tone: "text-emerald-300 bg-emerald-500/15 border-emerald-400/25",
    },
    {
      title: "Dugout",
      desc: "Explore franchise identity, history, milestones and rivalries.",
      href: `/dugout/${slug}`,
      icon: Shield,
      tone: "text-cyan-300 bg-cyan-500/15 border-cyan-400/25",
    },
  ];

  return (
    <section aria-labelledby="connected-tools-title" className="rounded-2xl border border-white/10 bg-[#0B1226]/85 p-5 sm:p-6 space-y-4">
      <div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--team-accent)]">
          Continue Across CricField
        </span>
        <h2 id="connected-tools-title" className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
          Connected Tools &amp; Related Editorials
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-xl border border-white/10 bg-[#070D1D] hover:border-[var(--team-accent)]/60 p-4 flex flex-col justify-between gap-3 transition-all"
            >
              <div className="space-y-2.5">
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${item.tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">{item.title}</h3>
                  <p className="text-[11px] text-white/55 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--team-accent)] group-hover:translate-x-0.5 transition-transform">
                Open {item.title} <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
