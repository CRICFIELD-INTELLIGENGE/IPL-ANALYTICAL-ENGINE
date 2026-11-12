// CRICFIELD Mobile 2.0 — the mobile app (loaded only below 1024px). Redesigned screens get their own mobile
// compositions; every other route renders the existing page inside the mobile shell, with the desktop chrome off.
// The floating AI launcher is not rendered on mobile: the AI tab replaces it.
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import { MobileChromeContext } from "./gate";
import { BottomTabs, Loading, TopBar } from "./shell";
import { UsageTracker } from "./usage";
import "./mobile.css";

const MHome = lazy(() => import("./screens/home"));
const MFeed = lazy(() => import("./screens/feed"));
const MDiscover = lazy(() => import("./screens/discover"));
const MPlay = lazy(() => import("./screens/play"));
const MDugout = lazy(() => import("./screens/franchise-dugout"));
const MStats = lazy(() => import("./screens/stats"));
const MPlayer = lazy(() => import("./screens/player"));
const MTeam = lazy(() => import("./screens/team"));
const MTeams = lazy(() => import("./screens/teams"));
const MScout = lazy(() => import("./screens/scout"));
const MAi = lazy(() => import("./screens/ai"));
const MJournal = lazy(() => import("./screens/journal"));

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  return null;
}

export default function MobileApp({ legacy }: { legacy: ReactNode }) {
  return (
    <div className="cfm">
      <a href="#cfm-main" className="cfm-skip" style={{ position: "absolute", left: -9999 }} onFocus={(e) => (e.currentTarget.style.left = "8px")} onBlur={(e) => (e.currentTarget.style.left = "-9999px")}>Skip to content</a>
      <TopBar />
      <ScrollToTop />
      <UsageTracker />
      <main id="cfm-main" className="cfm-main">
        <Suspense fallback={<Loading rows={4} h={90} />}>
          <Switch>
            <Route path="/" component={MHome} />
            <Route path="/home"><MHome /></Route>
            <Route path="/discover" component={MDiscover} />
            <Route path="/feed" component={MFeed} />
            <Route path="/arcade"><MPlay /></Route>
            <Route path="/dugout"><MDugout /></Route>
            <Route path="/dugout/articles/:slug"><Legacy legacy={legacy} /></Route>
            <Route path="/dugout/:team" component={MDugout} />
            <Route path="/stats"><MStats /></Route>
            <Route path="/players/:slug"><MPlayer /></Route>
            <Route path="/teams" component={MTeams} />
            <Route path="/teams/:slug"><MTeam /></Route>
            <Route path="/scout"><MScout /></Route>
            <Route path="/ai-analyst"><MAi /></Route>
            <Route path="/reports"><MJournal /></Route>
            <Route><Legacy legacy={legacy} /></Route>
          </Switch>
        </Suspense>
      </main>
      <BottomTabs />
    </div>
  );
}

/** The original page, rendered inside the mobile shell with the desktop chrome switched off. */
function Legacy({ legacy }: { legacy: ReactNode }) {
  return <MobileChromeContext.Provider value={true}><div className="cfm-legacy-wrap">{legacy}</div></MobileChromeContext.Provider>;
}

