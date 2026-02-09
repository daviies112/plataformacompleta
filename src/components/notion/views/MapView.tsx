import type { Database } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Trash2, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface MapViewProps {
  database: Database;
  onDeleteRow: (rowId: string) => void;
  isLocked: boolean;
}

export const MapView = ({ database, onDeleteRow, isLocked }: MapViewProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const locationField = database.fields.find(f => f.type === 'location' || f.name.toLowerCase().includes('local') || f.name.toLowerCase().includes('endereço') || f.name.toLowerCase().includes('location'));
  const titleField = database.fields.find(f => f.type === 'text') || database.fields[0];

  if (!locationField) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p>Adicione um campo de localização para usar a visualização de mapa</p>
        <p className="text-sm mt-2">Crie um campo com "local", "endereço" ou "location" no nome</p>
      </div>
    );
  }

  const locationsWithData = (database.rows || []).filter(row => row.values[locationField.id]);

  if (locationsWithData.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p>Nenhuma localização adicionada</p>
        <p className="text-sm mt-2">Adicione endereços ou coordenadas ao campo de localização</p>
      </div>
    );
  }

  const parseLocation = (location: string): { lat: number; lng: number; address: string } | null => {
    const coordsRegex = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
    const match = location.match(coordsRegex);
    
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
        address: location
      };
    }
    
    return {
      lat: 0,
      lng: 0,
      address: location
    };
  };

  const openInGoogleMaps = (location: string) => {
    const parsed = parseLocation(location);
    if (parsed) {
      const url = parsed.lat !== 0 
        ? `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parsed.address)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-4">
      <div className="bg-muted rounded-lg p-8 mb-4 text-center border-2 border-dashed border-border">
        <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">Visualização de Mapa Interativo</p>
        <p className="text-xs text-muted-foreground">
          Para integração completa com mapas, adicione uma chave de API do Google Maps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationsWithData.map(row => {
          const location = row.values[locationField.id];
          const title = titleField ? row.values[titleField.id] : 'Sem título';
          const parsed = parseLocation(location);

          return (
            <div 
              key={row.id} 
              className={`border border-border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer ${
                selectedLocation === row.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedLocation(row.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{title}</h4>
                    <p className="text-xs text-muted-foreground">Localização</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm flex-1">{parsed?.address}</p>
                </div>
                
                {database.fields
                  .filter(f => f.id !== locationField.id && f.id !== titleField?.id)
                  .map(field => {
                    const value = row.values[field.id];
                    if (!value) return null;
                    return (
                      <div key={field.id} className="text-xs text-muted-foreground">
                        <span className="font-medium">{field.name}:</span> {value.toString()}
                      </div>
                    );
                  })}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInGoogleMaps(location);
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Abrir no Maps
                </Button>
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRow(row.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm font-medium mb-2">💡 Dicas para usar o Mapa:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Use coordenadas no formato: <code className="bg-background px-1 py-0.5 rounded">-23.5505, -46.6333</code></li>
          <li>• Ou use endereços completos: <code className="bg-background px-1 py-0.5 rounded">Av. Paulista, 1578 - São Paulo, SP</code></li>
          <li>• Clique em "Abrir no Maps" para visualizar no Google Maps</li>
        </ul>
      </div>
    </div>
  );
};
