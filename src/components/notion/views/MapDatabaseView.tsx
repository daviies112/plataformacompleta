import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Database } from '@/types/notion';
import { databaseToKanban } from '@/types/unified';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapDatabaseViewProps {
  database: Database;
}

export const MapDatabaseView = ({ database }: MapDatabaseViewProps) => {
  const board = databaseToKanban(database);

  const cardsWithLocation = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived && card.location)
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    );

  // São Paulo as default center
  const defaultCenter: [number, number] = [-23.5505, -46.6333];
  
  // If we have cards with lat/lng, calculate bounds
  const cardsWithCoords = cardsWithLocation.filter(card => 
    card.location && 
    typeof card.location.latitude === 'number' && 
    typeof card.location.longitude === 'number'
  );

  const mapCenter = cardsWithCoords.length > 0 && cardsWithCoords[0].location
    ? [cardsWithCoords[0].location.latitude!, cardsWithCoords[0].location.longitude!] as [number, number]
    : defaultCenter;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Map View</h2>
        <div className="h-[500px] rounded-lg overflow-hidden border">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {cardsWithCoords.map((card: any) => (
              <Marker
                key={card.id}
                position={[card.location.latitude, card.location.longitude]}
              >
                <Popup>
                  <div className="p-2">
                    <div className="font-semibold">{card.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {card.location.name}
                    </div>
                    {card.location.address && (
                      <div className="text-xs text-muted-foreground">
                        {card.location.address}
                      </div>
                    )}
                    <Badge variant="outline" className="mt-2">{card.listName}</Badge>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {cardsWithLocation.length} cards with location data
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Cards with Location</h2>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {cardsWithLocation.length > 0 ? (
            cardsWithLocation.map((card: any) => (
              <div
                key={card.id}
                className="p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="font-medium">{card.title}</div>
                <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5" />
                  <div>
                    <div>{card.location.name}</div>
                    {card.location.address && (
                      <div className="text-xs">{card.location.address}</div>
                    )}
                    {card.location.latitude && card.location.longitude && (
                      <div className="text-xs opacity-70">
                        {card.location.latitude.toFixed(4)}, {card.location.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="mt-2">{card.listName}</Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No cards with location found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
