import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import OnFieldPage from "@/pages/on-field";
import { ProductPage, RevenuePage, GrowthPage, StrategyPage, ReportsPage, BlogsPage, AIAnalystPage } from "@/pages/section-pages";
import MatchDetailPage from "@/pages/match-detail";
import IntelligencePage from "@/pages/intelligence";
import PortalPage from "@/pages/portal";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={PortalPage} />
      <Route path="/home" component={Home} />
      <Route path="/intelligence" component={IntelligencePage} />
      <Route path="/on-field" component={OnFieldPage} />
      <Route path="/match/:id" component={MatchDetailPage} />
      <Route path="/product" component={ProductPage} />
      <Route path="/revenue" component={RevenuePage} />
      <Route path="/growth" component={GrowthPage} />
      <Route path="/strategy" component={StrategyPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/blogs" component={BlogsPage} />
      <Route path="/ai-analyst" component={AIAnalystPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
