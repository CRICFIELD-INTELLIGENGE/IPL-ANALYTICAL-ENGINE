import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import StatsPage from "@/pages/stats";
import DashboardPage from "@/pages/dashboard";
import BusinessPage from "@/pages/business";
import RecordsPage from "@/pages/records";
import MatchesPage from "@/pages/matches";
import NewsPage from "@/pages/news";
import MatchDetailPage from "@/pages/match-detail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/matches" component={MatchesPage} />
      <Route path="/match/:id" component={MatchDetailPage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/records" component={RecordsPage} />
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
