// CRICFIELD Mobile More (/discover & /more) — structured directory aligned with the approved mobile reference.
import type { CSSProperties } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  ChevronRight,
  Cpu,
  Info,
  Layers,
  MapPin,
  Shield,
  UserRound,
} from "lucide-react";
import { TEAM_CODE_TO_SLUG, useTeamTheme } from "@/lib/team-context";
import { WORKSPACE_TILES } from "../home-workspaces";
import "./discover.css";

export default function MobileDiscover() {
  const { theme } = useTeamTheme();
  const dugoutHref = theme ? `/dugout/${TEAM_CODE_TO_SLUG[theme.id]}` : "/dugout";

  return (
    <div
      className="mm-page"
      data-testid="mobile-more-page"
      style={{ "--mm-accent": theme?.accent ?? "#ffda7c" } as CSSProperties}
    >
      <header className="mm-hero">
        <img
          src="/venues-stadium.jpg"
          alt=""
          className="mm-hero-bg"
          loading="lazy"
        />
        <div className="mm-hero-body">
          <h1>More</h1>
          <p>Your complete cricket intelligence hub</p>
        </div>
      </header>

      {/* 1. CricField Workspaces */}
      <section className="mm-card-group" aria-labelledby="mm-workspaces-heading">
        <div className="mm-group-head">
          <Layers size={18} className="mm-group-icon" aria-hidden="true" />
          <div className="mm-group-titles">
            <h2 id="mm-workspaces-heading">CricField Workspaces</h2>
            <small>Build • Recruit • Plan • Analyse</small>
          </div>
        </div>
        <div className="mm-ws-grid">
          {WORKSPACE_TILES.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.id}
                href={ws.href}
                className="mm-ws-card"
                data-tone={ws.tone}
                data-testid={`more-workspace-${ws.id}`}
              >
                <img src={ws.img} alt="" className="mm-ws-art" loading="lazy" />
                <div className="mm-ws-top">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div className="mm-ws-copy">
                  <strong>{ws.title}</strong>
                  <small>{ws.moreSub}</small>
                </div>
                <span className="mm-ws-go" aria-hidden="true">
                  <ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. Analysis & Tools */}
      <section className="mm-card-group" aria-labelledby="mm-tools-heading">
        <div className="mm-group-head">
          <span className="mm-bar" aria-hidden="true" />
          <div className="mm-group-titles">
            <h2 id="mm-tools-heading">Analysis &amp; Tools</h2>
          </div>
        </div>
        <div className="mm-tools-grid">
          <Link href="/ai-analyst" className="mm-tool-card" data-testid="more-tool-decision-engine">
            <span className="mm-tool-ico" aria-hidden="true">
              <Cpu size={17} />
            </span>
            <div className="mm-tool-copy">
              <strong>Decision Engine</strong>
              <small>Ball-by-ball queries &amp; simulators</small>
            </div>
          </Link>
          <Link href="/stats" className="mm-tool-card" data-testid="more-tool-stats-centre">
            <span className="mm-tool-ico" aria-hidden="true">
              <BarChart3 size={17} />
            </span>
            <div className="mm-tool-copy">
              <strong>Stats Centre</strong>
              <small>Records, trends &amp; comparisons</small>
            </div>
          </Link>
        </div>
      </section>

      {/* 3. Explore & Read (Editorials | Dugout | Venue Atlas — NO Reports tile) */}
      <section className="mm-card-group" aria-labelledby="mm-explore-heading">
        <div className="mm-group-head">
          <span className="mm-bar" aria-hidden="true" />
          <div className="mm-group-titles">
            <h2 id="mm-explore-heading">Explore &amp; Read</h2>
          </div>
        </div>
        <div className="mm-explore-grid">
          <Link href="/editorials" className="mm-exp-card" data-testid="more-explore-editorials">
            <BookOpen size={18} className="mm-exp-ico" aria-hidden="true" />
            <div>
              <strong>Editorials</strong>
              <small>In-depth stories</small>
            </div>
          </Link>
          <Link href={dugoutHref} className="mm-exp-card" data-testid="more-explore-dugout">
            <Shield size={18} className="mm-exp-ico" aria-hidden="true" />
            <div>
              <strong>Dugout</strong>
              <small>Inside the game</small>
            </div>
          </Link>
          <Link href="/feed/venues" className="mm-exp-card" data-testid="more-explore-venues">
            <MapPin size={18} className="mm-exp-ico" aria-hidden="true" />
            <div>
              <strong>Venue Atlas</strong>
              <small>Grounds &amp; conditions</small>
            </div>
          </Link>
        </div>
      </section>

      {/* 4. IPL 2027 Auction Banner */}
      <section className="mm-auction-banner" aria-label="IPL 2027 Auction">
        <img src="/auction-gavel.jpg" alt="" className="mm-auction-art" loading="lazy" />
        <div className="mm-auction-copy">
          <span className="mm-auction-badge">IPL 2027 Auction</span>
          <h3>Auction Room</h3>
          <p>Latest updates, registered players, transactions &amp; squad impact</p>
        </div>
        <Link href="/pulse" className="mm-auction-cta">
          Open Auction <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </section>

      {/* 5. Account & CricField */}
      <section className="mm-card-group" aria-labelledby="mm-account-heading">
        <div className="mm-group-head">
          <span className="mm-bar" aria-hidden="true" />
          <div className="mm-group-titles">
            <h2 id="mm-account-heading">Account &amp; CricField</h2>
          </div>
        </div>
        <div className="mm-account-list">
          <Link href="/account" className="mm-account-row">
            <UserRound size={18} className="mm-acc-ico" aria-hidden="true" />
            <span className="mm-acc-copy">
              <strong>My Account</strong>
              <small>Profile, fan passport &amp; preferences</small>
            </span>
            <ChevronRight size={17} className="mm-acc-chev" aria-hidden="true" />
          </Link>
          <Link href="/account?tab=saved" className="mm-account-row">
            <Bookmark size={18} className="mm-acc-ico" aria-hidden="true" />
            <span className="mm-acc-copy">
              <strong>Saved Content</strong>
              <small>Shortlists, stats saves &amp; retention picks</small>
            </span>
            <ChevronRight size={17} className="mm-acc-chev" aria-hidden="true" />
          </Link>
          <Link href="/account?tab=notifications" className="mm-account-row">
            <Bell size={18} className="mm-acc-ico" aria-hidden="true" />
            <span className="mm-acc-copy">
              <strong>Notifications</strong>
              <small>Alerts, updates &amp; account preferences</small>
            </span>
            <ChevronRight size={17} className="mm-acc-chev" aria-hidden="true" />
          </Link>
          <Link href="/about" className="mm-account-row">
            <Info size={18} className="mm-acc-ico" aria-hidden="true" />
            <span className="mm-acc-copy">
              <strong>About CricField</strong>
              <small>Our vision, methodology &amp; data sources</small>
            </span>
            <ChevronRight size={17} className="mm-acc-chev" aria-hidden="true" />
          </Link>
        </div>
        <div className="mm-legal-strip" aria-label="CricField information links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </section>
    </div>
  );
}
