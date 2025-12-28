import { lazy, Suspense, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Calendar, Video, Settings, Palette, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import ReuniaoDashboardPage from "./ReuniaoDashboardPage";

// Lazy load heavy components
const Calendario = lazy(() => import("@/pages/Calendario"));
const Gravacoes = lazy(() => import("@/pages/Gravacoes"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const RoomDesignSettings = lazy(() => import("@/pages/RoomDesignSettings"));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

export default function ReuniaoHubPage() {
  const [activeTab, setActiveTab] = useState("home");
  const location = useLocation();
  
  // Detect if we are in a direct meeting URL /reuniao/{id}
  const meetingIdMatch = location.pathname.match(/\/reuniao\/([^\/]+)/);
  const meetingId = meetingIdMatch ? meetingIdMatch[1] : null;

  useEffect(() => {
    if (meetingId) {
      setActiveTab("home");
    }
  }, [meetingId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reuniões</h1>
        <p className="text-muted-foreground mt-1">
          Plataforma de videoconferências e gerenciamento de reuniões
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="home" className="gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="gravacoes" className="gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Gravações</span>
          </TabsTrigger>
          <TabsTrigger value="design" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Design</span>
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-6">
          <ReuniaoDashboardPage meetingId={meetingId} />
        </TabsContent>

        <TabsContent value="calendario" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <Calendario />
          </Suspense>
        </TabsContent>

        <TabsContent value="gravacoes" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <Gravacoes />
          </Suspense>
        </TabsContent>

        <TabsContent value="design" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <RoomDesignSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <Configuracoes />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
