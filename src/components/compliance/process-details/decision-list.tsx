import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BigdatacorpDecision } from "@shared/schema";
import { Gavel } from "lucide-react";

interface DecisionListProps {
  decisions: BigdatacorpDecision[];
}

export function DecisionList({ decisions }: DecisionListProps) {
  if (!decisions || decisions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma decisão registrada
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
          Total de {decisions.length} decisão(ões)
        </p>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {decisions.map((decision: any, index) => (
          <Card key={index} className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start gap-2">
                <Gavel className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  {(decision.Description || decision.DecisionDescription) && (
                    <p className="font-medium text-sm mb-1">
                      {decision.Description || decision.DecisionDescription}
                    </p>
                  )}
                  {(decision.Content || decision.DecisionContent) && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {decision.Content || decision.DecisionContent}
                    </p>
                  )}
                </div>
              </div>
              
              {(decision.Date || decision.DecisionDate) && (
                <Badge variant="outline" className="text-xs">
                  Data: {formatDate(decision.Date || decision.DecisionDate)}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
