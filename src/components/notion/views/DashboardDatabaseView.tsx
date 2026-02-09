import { Database } from '@/types/notion';
import { databaseToKanban } from '@/types/unified';

interface DashboardDatabaseViewProps {
  database: Database;
}

export const DashboardDatabaseView = ({ database }: DashboardDatabaseViewProps) => {
  const board = databaseToKanban(database);

  const allCards = board.lists
    .filter(list => !list.archived)
    .flatMap(list => 
      list.cards
        .filter(card => !card.archived)
        .map(card => ({ ...card, listId: list.id, listName: list.title }))
    );

  const cardsByList = board.lists
    .filter(list => !list.archived)
    .map(list => ({
      name: list.title,
      count: list.cards.filter(card => !card.archived).length,
    }));

  const now = new Date();
  const cardsByDueDate = {
    'Overdue': allCards.filter(card => card.dueDate && new Date(card.dueDate) < now && !card.completed).length,
    'Today': allCards.filter(card => card.dueDate && new Date(card.dueDate).toDateString() === now.toDateString()).length,
    'This week': allCards.filter(card => {
      if (!card.dueDate) return false;
      const dueDate = new Date(card.dueDate);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate > now && dueDate <= weekFromNow;
    }).length,
    'Future': allCards.filter(card => {
      if (!card.dueDate) return false;
      const dueDate = new Date(card.dueDate);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate > weekFromNow;
    }).length,
    'No date': allCards.filter(card => !card.dueDate).length,
  };

  const dueDateData = Object.entries(cardsByDueDate).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-6">
          <div className="text-sm text-muted-foreground">Total Cards</div>
          <div className="text-3xl font-bold mt-2">{allCards.length}</div>
        </div>
        <div className="bg-card rounded-lg border p-6">
          <div className="text-sm text-muted-foreground">Completed Cards</div>
          <div className="text-3xl font-bold mt-2 text-green-600">
            {allCards.filter(card => card.completed).length}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-6">
          <div className="text-sm text-muted-foreground">Overdue Cards</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {allCards.filter(card => card.dueDate && new Date(card.dueDate) < now && !card.completed).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Cards by List</h3>
          <div className="space-y-3">
            {cardsByList.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">{item.name}</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(item.count / Math.max(...cardsByList.map(i => i.count))) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xl font-bold">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Cards by Due Date</h3>
          <div className="space-y-3">
            {dueDateData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">{item.name}</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        item.name === 'Overdue' ? 'bg-red-500' : 
                        item.name === 'Today' ? 'bg-yellow-500' : 
                        'bg-blue-500'
                      }`}
                      style={{ width: `${(item.count / Math.max(...dueDateData.map(i => i.count), 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xl font-bold">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
