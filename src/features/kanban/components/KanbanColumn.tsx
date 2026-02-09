import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import LeadCard, { type Lead } from './LeadCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
  updatedLeadIds?: Set<string>;
}

export default function KanbanColumn({ id, title, color, leads, updatedLeadIds = new Set() }: KanbanColumnProps) {
  const hasUpdates = leads.some(lead => updatedLeadIds.has(lead.id));
  
  return (
    <div className="flex-shrink-0 w-72" data-testid={`column-${id}`}>
      <div className={`border border-card-border rounded-lg h-full flex flex-col ${color}`}>
        <div className="p-3 border-b border-card-border">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide truncate text-gray-900" data-testid={`text-column-title-${id}`}>
              {title}
            </h2>
            <div className="flex items-center gap-1">
              {hasUpdates && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Leads atualizados" />
              )}
              <Badge variant="secondary" className="rounded-full flex-shrink-0" data-testid={`badge-count-${id}`}>
                <Users className="w-3 h-3 mr-1" />
                {leads.length}
              </Badge>
            </div>
          </div>
        </div>

        <div
          className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]"
          data-testid={`dropzone-${id}`}
        >
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isUpdated={updatedLeadIds.has(lead.id)}
            />
          ))}
          {leads.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6">
              Nenhum lead
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
