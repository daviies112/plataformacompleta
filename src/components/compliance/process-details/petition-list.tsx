import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BigdatacorpPetition } from "@shared/schema";
import { FileText } from "lucide-react";

interface PetitionListProps {
  petitions: BigdatacorpPetition[];
}

export function PetitionList({ petitions }: PetitionListProps) {
  if (!petitions || petitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma petição registrada
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
          Total de {petitions.length} petição(ões)
        </p>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {petitions.map((petition, index) => (
          <Card key={index} className="border-l-4 border-l-green-500">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  {petition.Type && (
                    <Badge variant="outline" className="mb-2">
                      {petition.Type}
                    </Badge>
                  )}
                  {petition.Content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {petition.Content}
                    </p>
                  )}
                </div>
              </div>
              
              {petition.Date && (
                <Badge variant="outline" className="text-xs">
                  Data: {formatDate(petition.Date)}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
