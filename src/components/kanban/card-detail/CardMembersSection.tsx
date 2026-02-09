import { Card } from '@/types/kanban';
import { MemberAvatar } from '@/components/kanban/card/MemberAvatar';
import { User } from 'lucide-react';
import { defaultMembers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

interface CardMembersSectionProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export const CardMembersSection = ({ card, onUpdate }: CardMembersSectionProps) => {
  const [open, setOpen] = useState(false);

  const toggleMember = (memberId: string) => {
    const member = defaultMembers.find((m) => m.id === memberId);
    if (!member) return;

    const hasMember = card.members.some((m) => m.id === memberId);
    const updatedMembers = hasMember
      ? card.members.filter((m) => m.id !== memberId)
      : [...card.members, member];

    onUpdate({ ...card, members: updatedMembers });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {card.members.length > 0 ? (
          <div className="cursor-pointer">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
              <User className="w-4 h-4" />
              Membros
            </h4>
            <div className="flex flex-wrap gap-2 items-center">
              {card.members.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <MemberAvatar member={member} size="md" />
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full">
                +
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full justify-start h-auto p-0 hover:bg-transparent">
            <div className="text-left">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
                <User className="w-4 h-4" />
                Membros
              </h4>
              <Button variant="secondary" size="sm">
                Adicionar membros
              </Button>
            </div>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h3 className="font-semibold mb-3">Membros</h3>
        <div className="space-y-1">
          {defaultMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-secondary transition-colors"
            >
              <MemberAvatar member={member} size="sm" />
              <span className="text-sm">{member.name}</span>
              {card.members.some((m) => m.id === member.id) && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
