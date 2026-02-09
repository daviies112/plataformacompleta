import { Database } from '@/types/notion';
import { databaseToKanban } from '@/types/unified';
import { Badge } from '@/components/ui/badge';

interface TimelineDatabaseViewProps {
  database: Database;
}

export const TimelineDatabaseView = ({ database }: TimelineDatabaseViewProps) => {
  const board = databaseToKanban(database);

  const cardsWithDates = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived && card.dueDate)
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    )
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  if (cardsWithDates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No cards with due dates found
      </div>
    );
  }

  const minDate = new Date(Math.min(...cardsWithDates.map(c => new Date(c.dueDate!).getTime())));
  const maxDate = new Date(Math.max(...cardsWithDates.map(c => new Date(c.dueDate!).getTime())));
  const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-card rounded-lg border p-6 m-4">
      <h2 className="text-xl font-semibold mb-6">Timeline</h2>
      <div className="space-y-4">
        {cardsWithDates.map((card: any) => {
          const cardDate = new Date(card.dueDate);
          const daysFromStart = Math.ceil((cardDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
          const position = (daysFromStart / Math.max(daysDiff, 1)) * 100;
          
          return (
            <div key={card.id} className="relative">
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-muted-foreground">
                  {cardDate.toLocaleDateString('en-US')}
                </div>
                <div className="flex-1 relative">
                  <div className="h-12 bg-muted rounded-lg relative overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-lg ${
                        card.completed ? 'bg-green-500' : 
                        cardDate < new Date() ? 'bg-red-500' : 
                        'bg-blue-500'
                      } flex items-center px-3`}
                      style={{ width: `${Math.max(position, 15)}%` }}
                    >
                      <span className="text-sm font-medium text-white truncate">
                        {card.title}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-32 text-sm">
                  <Badge variant="outline">{card.listName}</Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
