import { CricfieldSplash } from "@/components/cricfield-splash";
import { CricketLoader } from "@/components/CricketLoader";
import {RouteHistoryTracker} from '@/lib/route-history';
import { CricFieldMascot } from "@/components/CricFieldMascot";
import { UsageTracker } from "@/components/public-metrics";
import TermsPage from "@/pages/terms";
import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { isTeamCode, TeamProvider } from "@/lib/team-context";
import { ThemeProvider } from "@/lib/theme";
import { ConsentBanner, AnalyticsRouteTracker } from "@/components/consent-banner";
import { CommercialZone } from "@/components/photo-policy";
import { AssistantLauncher } from "@/components/assistant-launcher";
import { useMobileGate } from "@/mobile/gate";

// CRICFIELD Mobile: a separate app shell below 1024px, loaded only on phones and small tablets.
const MobileApp = lazy(() => import("@/mobile/app"));

// Day 8: every page is its own chunk, loaded on first visit (the single bundle was 4.09 MB / 860 kB gzip).
const Home = lazy(() => import("@/pages/home"));
const FeedPage = lazy(() => import("./pages/feed"));
const Ipl2027Page = lazy(() => import("./pages/ipl-2027"));
const FeedCategoryPage = lazy(() => import("./pages/feed-category"));
const Ipl2027RetentionsPage = lazy(() => import("./pages/ipl-2027-retentions"));
const StatsPage = lazy(() => import("./pages/stats"));
const PulsePage = lazy(() => import("./pages/pulse"));
const ProductPage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.ProductPage })));
const RevenuePage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.RevenuePage })));
const GrowthPage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.GrowthPage })));
const StrategyPage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.StrategyPage })));
const ReportsPage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.ReportsPage })));
const BlogsPage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.BlogsPage })));
const AIAnalystPage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.AIAnalystPage })));
const InsightsPage = lazy(() => import("@/pages/section-pages").then((mod) => ({ default: mod.InsightsPage })));
const MatchDetailPage = lazy(() => import("@/pages/match-detail"));
const IntelligencePage = lazy(() => import("@/pages/intelligence"));
const AuctionPage = lazy(() => import("@/pages/auction"));
const PortalPage = lazy(() => import("@/pages/portal"));
const ScoresPage = lazy(() => import("@/pages/scores"));
const PlayerProfilePage = lazy(() => import("./pages/player"));
const PlayerIntelligencePage = lazy(() => import("./pages/ai-analyst-intelligence"));
const RetentionRoomPage = lazy(() => import("./pages/retention-room"));
/** The earlier room at /feed/squad merged into the Retention Room; old links keep their team. */
function SquadRedirect() {
  const team = new URLSearchParams(useSearch()).get("team")?.toUpperCase() ?? "";
  return <Redirect to={isTeamCode(team) ? `/retention-room/${team}` : "/retention-room"} replace />;
}
const VenueProfilePage = lazy(() => import("./pages/venue"));
const TeamProfilePage = lazy(() => import("./pages/team"));
const VisualizationsPage = lazy(() => import("./pages/visualizations"));
const AskPage = lazy(() => import("./pages/ai-analyst-ask"));
const WeaknessPage = lazy(() => import("./pages/ai-analyst-weakness"));
const PlayingXiPage = lazy(() => import("./pages/ai-analyst-playing-xi"));
const PressurePage = lazy(() => import("./pages/ai-analyst-pressure"));
const InsightFeedPage = lazy(() => import("./pages/ai-analyst-feed"));
const StrategySimPage = lazy(() => import("./pages/ai-analyst-strategy-sim"));
const AltUniversePage = lazy(() => import("./pages/ai-analyst-alt-universe"));
const OppositionMapPage = lazy(() => import("./pages/ai-analyst-opposition-map"));
const DecisionReplayPage = lazy(() => import("./pages/ai-analyst-decision-replay"));
const SquadDnaPage = lazy(() => import("./pages/ai-analyst-squad-dna"));
const AuctionWarRoomPage = lazy(() => import("./pages/ai-analyst-auction"));
const PlayerPoolPage = lazy(() => import("./pages/ai-analyst-player-pool"));
const DugoutPage = lazy(() => import("./pages/dugout"));
const ArticleDetailPage = lazy(() => import("./pages/article-detail"));
const PhotoPipelineDashboard = lazy(() => import("./pages/photo-pipeline-dashboard"));
const EditorialImageReviewPage = lazy(() => import("./pages/editorial-image-review"));
const AdminAnalytics = lazy(() => import("./pages/admin-analytics"));
const AccountPage = lazy(() => import("./pages/account"));
const AboutPage = lazy(() => import("./pages/about"));
const MethodologyPage = lazy(() => import("./pages/methodology"));
const DataSourcesPage = lazy(() => import("./pages/data-sources"));
const ContactPage = lazy(() => import("./pages/contact"));
const DisclaimerPage = lazy(() => import("./pages/disclaimer"));
const PrivacyPage = lazy(() => import("./pages/privacy"));
const ScoutResultsPage = lazy(() => import("./pages/scout-results"));
const ScoutHomePage = lazy(() => import("@/pages/scout-home"));
const ScoutPlayerPage = lazy(() => import("@/pages/scout-player"));
const ScoutComparePage = lazy(() => import("@/pages/scout-compare"));
const ScoutRolesPage = lazy(() => import("@/pages/scout-roles"));
const CupChaseGame = lazy(() => import('@/pages/arcade/cup-chase-game'));
const ArcadeHomePage = lazy(() => import("@/pages/arcade/arcade-home"));
const HandCricketGame = lazy(() => import("@/pages/arcade/hand-cricket-game"));
const GuessCricketerGame = lazy(() => import("@/pages/arcade/guess-cricketer-game"));
const SuperOverGame = lazy(() => import("@/pages/arcade/super-over-game"));
const AuctionRoomGame = lazy(() => import("@/pages/arcade/auction-room-game"));
const CricketGridGame = lazy(() => import("@/pages/arcade/cricket-grid-game"));


// Internal pages (photo pipeline) are hidden from production builds unless
// VITE_ENABLE_ADMIN_PAGES=true is set at build time.
const ADMIN_PAGES_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN_PAGES === "true";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

/** Shown while a page's chunk loads: the app background and cricket intelligence loader. */
function RouteLoading() {
  return (
    <div role="status" aria-live="polite" className="min-h-screen w-full bg-[#070c16] flex flex-col items-center justify-center p-4">
      <CricketLoader label="LOADING INTELLIGENCE…" sublabel="Initializing telemetry & match feeds" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteLoading />}>
    <Switch>
      {/* Root redirects to Home */}
      <Route path="/">
        <Redirect to="/home" />
      </Route>
      <Route path="/home" component={Home} />
      {/* Beyond XI: Franchise Headquarters & Fan Arena */}
      <Route path="/dugout/articles/:slug" component={ArticleDetailPage} />
      <Route path="/articles/:slug" component={ArticleDetailPage} />
      <Route path="/dugout" component={DugoutPage} />
      <Route path="/dugout/:team" component={DugoutPage} />
      {/* Internal tooling: only routed in dev builds, or when explicitly enabled. */}
      {ADMIN_PAGES_ENABLED && <Route path="/admin/photo-pipeline" component={PhotoPipelineDashboard} />}
      {ADMIN_PAGES_ENABLED && <Route path="/photo-pipeline" component={PhotoPipelineDashboard} />}
      {ADMIN_PAGES_ENABLED && <Route path="/admin/editorial-images" component={EditorialImageReviewPage} />}
      <Route path="/arena"><Redirect to="/feed" /></Route>
      <Route path="/beyond-xi"><Redirect to="/feed" /></Route>
      <Route path="/fan-arena"><Redirect to="/feed" /></Route>
      {/* On-Field Panel System */}
      <Route path="/intelligence" component={IntelligencePage} />
      {/* Top-level destinations. */}
      <Route path="/feed/ipl-2027" component={Ipl2027Page} />
      <Route path="/feed/ipl-2027/retentions" component={Ipl2027RetentionsPage} />
      <Route path="/feed/squad" component={SquadRedirect} />
      <Route path="/feed/:category" component={FeedCategoryPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/stats"><StatsPage /></Route>
      <Route path="/pulse" component={PulsePage} />
      {/* Scout Lab: Global Talent Intelligence across 6 leagues */}
      <Route path="/scout/results" component={ScoutResultsPage} />
      <Route path="/scout" component={ScoutHomePage} />
      <Route path="/scout/player/:id" component={PlayerProfilePage} />
      <Route path="/scout/compare" component={ScoutComparePage} />
      <Route path="/scout/roles" component={ScoutRolesPage} />

            {/* Deprecated video routes redirect to Fan Arena */}
      <Route path="/watch">
        <Redirect to="/feed" />
      </Route>
      <Route path="/watch-and-analyze">
        <Redirect to="/feed" />
      </Route>

      {/* CricField Arcade: Cricket Mini-Games */}
      <Route path="/arcade" component={ArcadeHomePage} />
      <Route path="/arcade/cup-chase" component={CupChaseGame}/>
      <Route path="/arcade/hand-cricket" component={HandCricketGame} />
      <Route path="/arcade/guess-cricketer" component={GuessCricketerGame} />
      <Route path="/arcade/super-over" component={SuperOverGame} />
      <Route path="/arcade/auction-room" component={AuctionRoomGame} />
      <Route path="/arcade/cricket-grid" component={CricketGridGame} />
      {/* The former /on-field/* paths, kept as redirects so anything already
          bookmarked or shared keeps working rather than 404ing. */}
      <Route path="/on-field/feed">
        <Redirect to="/feed" />
      </Route>
      <Route path="/on-field/stats">
        <Redirect to="/stats" />
      </Route>
      <Route path="/on-field/pulse">
        <Redirect to="/pulse" />
      </Route>
      <Route path="/on-field">
        <Redirect to="/feed" />
      </Route>
      <Route path="/match/:id" component={MatchDetailPage} />
      <Route path="/product">
        <Redirect to="/intelligence?role=product" />
      </Route>
      <Route path="/revenue">
        <Redirect to="/intelligence?role=business" />
      </Route>
      <Route path="/growth">
        <Redirect to="/intelligence?role=growth" />
      </Route>
      <Route path="/strategy" component={FeedPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/blogs" component={BlogsPage} />
      <Route path="/insights">
        <Redirect to="/intelligence?tab=Insights" />
      </Route>
<Route path="/auction">
        <Redirect to="/arcade" />
      </Route>
        <Route path="/scores" component={ScoresPage} />
        <Route path="/ai-analyst/ask" component={AskPage} />
        <Route path="/ai-analyst/weakness" component={WeaknessPage} />
        <Route path="/ai-analyst/playing-xi" component={PlayingXiPage} />
        <Route path="/ai-analyst/pressure" component={PressurePage} />
        <Route path="/ai-analyst/feed" component={InsightFeedPage} />
        <Route path="/ai-analyst/strategy-sim" component={StrategySimPage} />
        <Route path="/ai-analyst/strategy">
          <Redirect to="/ai-analyst/strategy-sim" />
        </Route>
        <Route path="/ai-analyst/alt-universe" component={AltUniversePage} />
        <Route path="/ai-analyst/opposition-map" component={OppositionMapPage} />
        <Route path="/ai-analyst/exploit-map">
          <Redirect to="/ai-analyst/opposition-map" />
        </Route>
        <Route path="/ai-analyst/decision-replay" component={DecisionReplayPage} />
        <Route path="/ai-analyst/squad-dna" component={SquadDnaPage} />
        <Route path="/ai-analyst/auction-war-room" component={AuctionWarRoomPage} />
        <Route path="/ai-analyst/player-pool" component={PlayerPoolPage} />
        <Route path="/ai-analyst/squad-builder" component={PlayerIntelligencePage} />
        <Route path="/retention-room/:team" component={RetentionRoomPage} />
        <Route path="/retention-room" component={RetentionRoomPage} />
        <Route path="/ai-analyst" component={AIAnalystPage} />
        <Route path="/players/:slug" component={PlayerProfilePage} />
        <Route path="/venues/:slug" component={VenueProfilePage} />
        <Route path="/teams/:slug" component={TeamProfilePage} />
        <Route path="/teams">
          <Redirect to="/dugout" />
        </Route>
        <Route path="/visualizations" component={VisualizationsPage} />
        {/* Shop & merchandise: a commercial zone, so editorial (Getty-sourced) photos never render here. */}
        
        <Route path="/account" component={AccountPage} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/about" component={AboutPage} />
        <Route path="/methodology" component={MethodologyPage} />
        <Route path="/data-sources" component={DataSourcesPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/disclaimer" component={DisclaimerPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        
        
        <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

/** Desktop (≥1024px) renders exactly the original tree; below that the mobile shell wraps the same routes. */
function ViewportExperience() {
  const mobile = useMobileGate();
  if (!mobile) return <><Router /><AssistantLauncher /></>;
  return <Suspense fallback={<RouteLoading />}><MobileApp legacy={<Router />} /></Suspense>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <TeamProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              {/* GA4 counts one page view on load and never sees a client-side
                  route change, so page views are sent per navigation instead. */}
              <RouteHistoryTracker /><AnalyticsRouteTracker /><UsageTracker />
              <ViewportExperience />
              <CricfieldSplash />
            </WouterRouter>
            <ConsentBanner />
            <Toaster />
          </TeamProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

