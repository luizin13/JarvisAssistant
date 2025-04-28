import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/lib/theme-provider";
import AppLayout from "@/components/layout/app-layout";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/dashboard";
import Transport from "@/pages/transport";
import Farm from "@/pages/farm";
import Credit from "@/pages/credit";
import MetaAds from "@/pages/meta-ads";
import News from "@/pages/news";
import NewsFeed from "@/pages/news-feed";
import Suggestions from "@/pages/suggestions";
import GovernmentBids from "@/pages/government-bids";
import GovernmentOfficials from "@/pages/government-officials";
import VoiceAssistant from "@/pages/voice-assistant";
import PersonalGuide from "@/pages/personal-guide";
import PrivacySettings from "@/pages/privacy-settings";
import MultiAgent from "@/pages/multi-agent";
import SystemOrchestrator from "@/pages/system-orchestrator";
import PythonAPI from "@/pages/python-api";
import ExternalAgents from "@/pages/external-agents";
import DailyMissions from "@/pages/daily-missions";
import SystemMonitor from "@/pages/system-monitor";
import IntelligencePanel from "@/pages/intelligence-panel";
import IntensiveImprovement from "@/pages/intensive-improvement";
import SystemSettings from "@/pages/system-settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/transport" component={Transport} />
      <Route path="/farm" component={Farm} />
      <Route path="/credit" component={Credit} />
      <Route path="/meta-ads" component={MetaAds} />
      <Route path="/news" component={NewsFeed} />
      <Route path="/news/classic" component={News} />
      <Route path="/suggestions" component={Suggestions} />
      <Route path="/government-bids" component={GovernmentBids} />
      <Route path="/government-officials" component={GovernmentOfficials} />
      <Route path="/voice-assistant" component={VoiceAssistant} />
      <Route path="/personal-guide" component={PersonalGuide} />
      <Route path="/privacy" component={PrivacySettings} />
      <Route path="/multi-agent" component={MultiAgent} />
      <Route path="/system-orchestrator" component={SystemOrchestrator} />
      <Route path="/python-api" component={PythonAPI} />
      <Route path="/external-agents" component={ExternalAgents} />
      <Route path="/daily-missions" component={DailyMissions} />
      <Route path="/system-monitor" component={SystemMonitor} />
      <Route path="/system-settings" component={SystemSettings} />
      <Route path="/intelligence" component={IntelligencePanel} />
      <Route path="/intensive-improvement" component={IntensiveImprovement} />
      
      {/* Redirecionamento da antiga página de chat para o assistente de voz */}
      <Route path="/chat">
        {() => {
          window.location.href = "/voice-assistant";
          return null;
        }}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <div className="jarvis-system-container">
          <AppLayout>
            <Router />
          </AppLayout>
          <Toaster />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
