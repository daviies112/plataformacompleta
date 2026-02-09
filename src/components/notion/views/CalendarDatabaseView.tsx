import { useState } from 'react';
import { Database } from '@/types/notion';
import { databaseToKanban } from '@/types/unified';
import { CardDetailModal } from '@/components/CardDetailModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { labelColorClasses } from '@/lib/labelColors';

interface CalendarDatabaseViewProps {
  database: Database;
  onUpdateDatabase: (database: Database) => void;
}

export const CalendarDatabaseView = ({ database, onUpdateDatabase }: CalendarDatabaseViewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCard, setSelectedCard] = useState<{ card: any; listId: string } | null>(null);

  const board = databaseToKanban(database);

  const cardsWithDates = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived && card.dueDate)
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    );

  const cardsByDate = cardsWithDates.reduce((acc: any, card: any) => {
    const dateKey = new Date(card.dueDate).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(card);
    return acc;
  }, {});

  const selectedDateCards = selectedDate ? cardsByDate[selectedDate.toDateString()] || [] : [];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Calendar</h2>
          <div className="flex justify-center">
            <div className="text-sm space-y-2">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              {(() => {
                const currentDate = selectedDate || new Date();
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const weeks = [];
                let week = [];
                
                for (let i = 0; i < firstDay; i++) {
                  week.push(<div key={`empty-${i}`} className="p-2"></div>);
                }
                
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month, day);
                  const dateKey = date.toDateString();
                  const hasCards = cardsByDate[dateKey]?.length > 0;
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  
                  week.push(
                    <button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`p-2 rounded-md hover:bg-muted transition-colors ${
                        isSelected ? 'bg-primary text-primary-foreground' : ''
                      } ${hasCards ? 'font-semibold' : ''}`}
                    >
                      <div>{day}</div>
                      {hasCards && (
                        <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1"></div>
                      )}
                    </button>
                  );
                  
                  if (week.length === 7) {
                    weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-2">{week}</div>);
                    week = [];
                  }
                }
                
                if (week.length > 0) {
                  while (week.length < 7) {
                    week.push(<div key={`empty-end-${week.length}`} className="p-2"></div>);
                  }
                  weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-2">{week}</div>);
                }
                
                return weeks;
              })()}
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate || new Date());
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}
            >
              Previous
            </Button>
            <span className="font-semibold">
              {(selectedDate || new Date()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate || new Date());
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">
            Cards for {selectedDate?.toLocaleDateString('en-US')}
          </h2>
          <div className="space-y-2">
            {selectedDateCards.length > 0 ? (
              selectedDateCards.map((card: any) => (
                <div
                  key={card.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedCard({ card, listId: card.listId })}
                >
                  <div className="font-medium">{card.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    List: {card.listName}
                  </div>
                  {card.labels.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {card.labels.map((label: any) => (
                        <Badge 
                          key={label.id} 
                          className={`text-white ${labelColorClasses[label.color] || 'bg-gray-500 hover:bg-gray-600'}`}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No cards on this date
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          listId={selectedCard.listId}
          lists={board.lists.filter(list => !list.archived)}
          onClose={() => setSelectedCard(null)}
          onUpdate={() => {}}
          onDelete={() => {}}
          onMove={() => {}}
          onCopy={() => {}}
          onArchive={() => {}}
        />
      )}
    </>
  );
};
