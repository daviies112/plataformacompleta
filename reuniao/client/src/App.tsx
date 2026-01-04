import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { HMSRoomProvider } from "@100mslive/react-sdk";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

import RecordingView from "@/pages/RecordingView";
import Dashboard from "@/pages/Dashboard";
import Calendario from "@/pages/Calendario";
import Reuniao from "@/pages/Reuniao";
import Configuracoes from "@/pages/Configuracoes";
import PublicBookingPage from "@/pages/PublicBookingPage";
import PublicMeetingRoom from "@/pages/PublicMeetingRoom";
import RoomDesignSettings from "@/pages/RoomDesignSettings";
import Gravacoes from "@/pages/Gravacoes";
import NotFound from "@/pages/not-found";

function AppRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/recording/:roomId">
        <RecordingView />
      </Route>
      <Route path="/agendar/:companySlug/:meetingSlug">
        <PublicBookingPage />
      </Route>
      <Route path="/reuniao/:companySlug/:roomId">
        <PublicMeetingRoom />
      </Route>
      <Route path="/dashboard">
        <AppRoute component={Dashboard} />
      </Route>
      <Route path="/calendario">
        <AppRoute component={Calendario} />
      </Route>
      <Route path="/configuracoes">
        <AppRoute component={Configuracoes} />
      </Route>
      <Route path="/room-design">
        <AppRoute component={RoomDesignSettings} />
      </Route>
      <Route path="/gravacoes">
        <AppRoute component={Gravacoes} />
      </Route>
      
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/login">
        <Redirect to="/dashboard" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HMSRoomProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </HMSRoomProvider>
  );
}

export default App;
