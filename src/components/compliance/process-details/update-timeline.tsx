import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BigdatacorpUpdate } from "@shared/schema";
import { Calendar } from "lucide-react";

interface UpdateTimelineProps {
  updates: BigdatacorpUpdate[];
}

export function UpdateTimeline({ updates }: UpdateTimelineProps) {
  if (!updates || updates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma movimentação registrada
      </p>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Data não informada';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium">
          Total de {updates.length} movimentação(ões)
        </p>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {updates.map((update, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {update.Description && (
                    <p className="font-medium text-sm mb-1">{update.Description}</p>
                  )}
                  {update.Content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {update.Content}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs">
                {update.Date && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(update.Date)}</span>
                  </div>
                )}
                {update.PublicationDate && (
                  <Badge variant="outline" className="text-xs">
                    Publicado: {formatDate(update.PublicationDate)}
                  </Badge>
                )}
                {update.CaptureDate && (
                  <Badge variant="secondary" className="text-xs">
                    Capturado: {formatDate(update.CaptureDate)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
