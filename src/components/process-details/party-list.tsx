import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BigdatacorpParty } from "@shared/schema";

interface PartyListProps {
  parties: BigdatacorpParty[];
}

export function PartyList({ parties }: PartyListProps) {
  if (!parties || parties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma parte registrada
      </p>
    );
  }

  const getPolarityBadge = (polarity?: string) => {
    if (!polarity) return null;
    
    const variant = polarity === 'Ativo' || polarity === 'Active' 
      ? 'default' 
      : polarity === 'Passivo' || polarity === 'Passive'
      ? 'destructive'
      : 'secondary';
    
    const label = polarity === 'Active' ? 'Polo Ativo' : 
                  polarity === 'Passive' ? 'Polo Passivo' : 
                  polarity === 'Ativo' ? 'Polo Ativo' :
                  polarity === 'Passivo' ? 'Polo Passivo' : 'Neutro';
    
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-3">
      {parties.map((party, index) => (
        <Card key={index} className="border-l-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium">
                {party.Name || 'Nome não informado'}
              </CardTitle>
              <div className="flex gap-1 flex-wrap">
                {getPolarityBadge(party.Polarity)}
                {party.Type && (
                  <Badge variant="outline" className="text-xs">
                    {party.Type}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {party.Document && (
              <div>
                <span className="text-muted-foreground">Documento:</span>{' '}
                <span className="font-mono text-xs">{party.Document}</span>
              </div>
            )}
            
            {party.OAB && (
              <div>
                <span className="text-muted-foreground">OAB:</span>{' '}
                <span className="font-medium">
                  {party.OAB}
                  {party.OABState && ` / ${party.OABState}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Total: {parties.length} parte(s)
      </p>
    </div>
  );
}
