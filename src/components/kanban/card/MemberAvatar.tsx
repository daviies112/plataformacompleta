import { Member } from '@/types/kanban';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MemberAvatarProps {
  member: Member;
  size?: 'sm' | 'md' | 'lg';
}

export const MemberAvatar = ({ member, size = 'md' }: MemberAvatarProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  return (
    <Avatar className={cn(sizeClasses[size], 'border-2 border-background')}>
      <AvatarImage src={member.avatar} alt={member.name} />
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {member.initials}
      </AvatarFallback>
    </Avatar>
  );
};
