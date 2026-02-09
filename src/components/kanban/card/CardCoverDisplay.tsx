import { CardCover, LabelColor } from '@/types/kanban';

interface CardCoverDisplayProps {
  cover: CardCover;
}

const coverColorClasses: Record<string, string> = {
  green: 'bg-label-green',
  yellow: 'bg-label-yellow',
  orange: 'bg-label-orange',
  red: 'bg-label-red',
  purple: 'bg-label-purple',
  blue: 'bg-label-blue',
  sky: 'bg-label-sky',
  lime: 'bg-label-lime',
  pink: 'bg-label-pink',
  black: 'bg-label-black',
};

export const CardCoverDisplay = ({ cover }: CardCoverDisplayProps) => {
  const height = cover.size === 'full' ? 'h-40' : 'h-32';

  if (cover.type === 'color') {
    const isHexColor = cover.value.startsWith('#');
    
    return (
      <div
        className={`w-full ${height} ${!isHexColor ? (coverColorClasses[cover.value] || 'bg-primary') : ''}`}
        style={isHexColor ? { backgroundColor: cover.value } : undefined}
      />
    );
  }

  return (
    <div className={`w-full ${height} overflow-hidden`}>
      <img
        src={cover.value}
        alt="Card cover"
        className="w-full h-full object-cover"
      />
    </div>
  );
};
