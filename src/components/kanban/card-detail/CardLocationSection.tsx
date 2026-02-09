import { useState } from 'react';
import { Card, Location } from '@/types/kanban';
import { MapPin, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CardLocationSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export const CardLocationSection = ({ card, onUpdate }: CardLocationSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  if (!card.location) return null;

  const deleteLocation = () => {
    onUpdate({ ...card, location: undefined });
  };

  const startEditing = () => {
    setLocationName(card.location?.name || '');
    setLocationAddress(card.location?.address || '');
    setIsEditing(true);
  };

  const saveLocation = () => {
    if (!locationName.trim() || !locationAddress.trim()) return;

    const updatedLocation: Location = {
      id: card.location?.id || `location-${Date.now()}`,
      name: locationName,
      address: locationAddress,
    };

    onUpdate({ ...card, location: updatedLocation });
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Local</h3>
        </div>
        <div className="space-y-3 p-4 bg-secondary/30 rounded">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Nome do local
            </label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="São Paulo"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Endereço / Região
            </label>
            <Input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="São Paulo, Brasil"
              onKeyPress={(e) => e.key === 'Enter' && saveLocation()}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveLocation}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEditing}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <MapPin className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Local</h3>
      </div>
      <div className="relative group">
        <div className="p-4 bg-secondary/30 rounded hover:bg-secondary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{card.location.name}</h4>
              <p className="text-sm text-muted-foreground">{card.location.address}</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={startEditing}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={deleteLocation}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
