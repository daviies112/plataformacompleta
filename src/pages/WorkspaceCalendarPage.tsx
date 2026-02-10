import { WorkspaceCalendarView } from '@/components/notion/views/WorkspaceCalendarView';
import { useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

interface WorkspaceCalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  source: 'database' | 'board' | 'google_calendar';
  sourceId: string;
  description?: string;
  type: 'date' | 'dueDate' | 'calendar_event';
  metadata?: {
    databaseId?: string;
    fieldId?: string;
    boardId?: string;
    cardId?: string;
    googleEventId?: string;
  };
}

const WorkspaceCalendarPage = () => {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Calendário do Workspace | NEXUS Intelligence";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Visualize todos os eventos de databases, quadros e Google Calendar em um só lugar com a plataforma NEXUS Intelligence.');
    
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', 'Calendário do Workspace | NEXUS Intelligence');
    
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', 'Visualize todos os eventos de databases, quadros e Google Calendar em um só lugar com a plataforma NEXUS Intelligence.');
    
    let ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType) {
      ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      document.head.appendChild(ogType);
    }
    ogType.setAttribute('content', 'website');
    
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', window.location.href);
  }, []);

  const handleEventClick = useCallback((event: WorkspaceCalendarEvent) => {
    if (event.source === 'board') {
      if (event.metadata?.boardId) {
        setLocation(`/plataforma/workspace/board/${event.metadata.boardId}`);
        toast.success('Redirecionando...', {
          description: `Abrindo quadro: ${event.title}`,
        });
      } else {
        toast.error('Erro no evento', {
          description: 'Dados do quadro não encontrados. Entre em contato com o suporte.',
        });
      }
    } else if (event.source === 'database') {
      if (event.metadata?.databaseId) {
        setLocation(`/plataforma/workspace/database/${event.metadata.databaseId}`);
        toast.success('Redirecionando...', {
          description: `Abrindo database: ${event.title}`,
        });
      } else {
        toast.error('Erro no evento', {
          description: 'Dados da database não encontrados. Entre em contato com o suporte.',
        });
      }
    } else if (event.source === 'google_calendar') {
      toast.info('Evento do Google Calendar', {
        description: 'Este evento é do Google Calendar e não pode ser aberto diretamente.',
      });
    }
  }, [setLocation]);

  return (
    <>
      {isMobile && (
        <div className="px-4 pb-2 pt-0">
          <h1 className="text-2xl font-bold text-foreground">Calendário do Workspace</h1>
        </div>
      )}
      
      <div className={cn(
        "relative z-10 container mx-auto pt-0 pb-4 space-y-6 animate-fade-in",
        "px-4 md:px-6 lg:px-8",
        "sm:pb-6 lg:pb-8 lg:space-y-8",
        isMobile && "pb-24"
      )}>
        <div className={cn("space-y-6", !isMobile && "lg:space-y-8")}>
          <div className="hidden md:block">
            <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text">
              Calendário do Workspace
            </h1>
            <p className="text-xl text-muted-foreground/80 mt-2">
              Visualize todos os eventos de databases, quadros e Google Calendar em um só lugar
            </p>
          </div>

          <WorkspaceCalendarView showSyncButtons={true} onEventClick={handleEventClick} />
        </div>
      </div>
    </>
  );
};

export default WorkspaceCalendarPage;
