import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import FeedPage from "./pages/feed";
import StatsPage from "./pages/stats";
import PulsePage from "./pages/pulse";
import { ProductPage, RevenuePage, GrowthPage, StrategyPage, ReportsPage, BlogsPage, AIAnalystPage, InsightsPage } from "@/pages/section-pages";
import MatchDetailPage from "@/pages/match-detail";
import IntelligencePage from "@/pages/intelligence";
import AuctionPage from "@/pages/auction";
import PortalPage from "@/pages/portal";
import ScoresPage from "@/pages/scores";
import PlayerProfilePage from "./pages/player";
import VenueProfilePage from "./pages/venue";
import TeamProfilePage from "./pages/team";
import VisualizationsPage from "./pages/visualizations";
import ShopPage from "./pages/shop";
import AskPage from "./pages/ai-analyst-ask";
import WeaknessPage from "./pages/ai-analyst-weakness";
import PressurePage from "./pages/ai-analyst-pressure";
import InsightFeedPage from "./pages/ai-analyst-feed";
import StrategySimPage from "./pages/ai-analyst-strategy-sim";
import AltUniversePage from "./pages/ai-analyst-alt-universe";
import OppositionMapPage from "./pages/ai-analyst-opposition-map";
import DecisionReplayPage from "./pages/ai-analyst-decision-replay";
import SquadDnaPage from "./pages/ai-analyst-squad-dna";
import AuctionWarRoomPage from "./pages/ai-analyst-auction";
import PlayerPoolPage from "./pages/ai-analyst-player-pool";
import DugoutPage from "./pages/dugout";
import FanArenaPage from "./pages/fan-arena";
import { TeamProvider } from "@/lib/team-context";
import AboutPage from "./pages/about";
import MethodologyPage from "./pages/methodology";
import DataSourcesPage from "./pages/data-sources";
import ContactPage from "./pages/contact";
import DisclaimerPage from "./pages/disclaimer";
import PrivacyPage from "./pages/privacy";
import { ConsentBanner, AnalyticsRouteTracker } from "@/components/consent-banner";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function Router() {
  return (
    <Switch>
      {/* Root redirects to Home */}
      <Route path="/">
        <Redirect to="/home" />
      </Route>
      <Route path="/home" component={Home} />
      {/* Beyond XI: Franchise Headquarters & Fan Arena */}
      <Route path="/dugout" component={DugoutPage} />
      <Route path="/dugout/:team" component={DugoutPage} />
      <Route path="/arena" component={FanArenaPage} />
      <Route path="/beyond-xi" component={FanArenaPage} />
      <Route path="/fan-arena" component={FanArenaPage} />
      {/* On-Field Panel System */}
      <Route path="/intelligence" component={IntelligencePage} />
      {/* Top-level destinations. */}
      <Route path="/feed" component={FeedPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/pulse" component={PulsePage} />
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
      <Route path="/insights" component={InsightsPage} />
<Route path="/auction" component={AuctionPage} />
        <Route path="/scores" component={ScoresPage} />
        <Route path="/ai-analyst/ask" component={AskPage} />
        <Route path="/ai-analyst/weakness" component={WeaknessPage} />
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
        <Route path="/ai-analyst" component={AIAnalystPage} />
        <Route path="/players/:slug" component={PlayerProfilePage} />
        <Route path="/venues/:slug" component={VenueProfilePage} />
        <Route path="/teams/:slug" component={TeamProfilePage} />
        <Route path="/visualizations" component={VisualizationsPage} />
        <Route path="/shop" component={ShopPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/methodology" component={MethodologyPage} />
        <Route path="/data-sources" component={DataSourcesPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/disclaimer" component={DisclaimerPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/merch">
          <Redirect to="/shop" />
        </Route>
        <Route path="/store">
          <Redirect to="/shop" />
        </Route>
        <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TeamProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            {/* GA4 counts one page view on load and never sees a client-side
                route change, so page views are sent per navigation instead. */}
            <AnalyticsRouteTracker />
            <Router />
          </WouterRouter>
          <ConsentBanner />
          <Toaster />
        </TeamProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
