import { useEffect } from 'react';
import { useNotionStore } from '@/stores/notionStore';

export const ViewTester = ({ viewType }: { viewType?: string }) => {
  const { databases, setCurrentView } = useNotionStore();

  useEffect(() => {
    const testDb = databases.find(db => db.title.includes('Teste de Views'));
    
    if (testDb && viewType) {
      const view = testDb.views?.find(v => v.type === viewType);
      if (view) {
        setTimeout(() => {
          setCurrentView(testDb.id, view.id);
          console.log(`✅ Switched to ${viewType} view`);
        }, 100);
      }
    }
  }, [viewType, databases]);

  return null;
};
