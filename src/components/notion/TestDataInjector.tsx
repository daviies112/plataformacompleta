import { useEffect, useRef } from 'react';
import { useNotionStore } from '@/stores/notionStore';

export const TestDataInjector = () => {
  const hasInjected = useRef(false);

  useEffect(() => {
    if (hasInjected.current) return;
    
    const { databases, boards, addDatabase, updateDatabase, addView, addBoard, setCurrentBoard } = useNotionStore.getState();
    const testDbExists = databases.some(db => db.title.includes('Teste de Views') && db.views && db.views.length > 5);
    const testBoardExists = boards.some(b => b.title.includes('Kanban Board'));
    
    if (!testDbExists) {
      console.log('🧪 Injecting test database...');
      hasInjected.current = true;
      
      addDatabase();
      
      setTimeout(() => {
        const newDb = useNotionStore.getState().databases[useNotionStore.getState().databases.length - 1];
        
        if (newDb) {
          updateDatabase(newDb.id, {
            title: "Teste de Views - Database Completo",
            icon: "🧪",
            description: "Database de teste com todos os tipos de campos e views",
            fields: [
              { id: "field-title", name: "Título", type: "text" },
              { id: "field-status", name: "Status", type: "select", options: ["A Fazer", "Em Progresso", "Concluído", "Revisão"] },
              { id: "field-priority", name: "Prioridade", type: "select", options: ["Alta", "Média", "Baixa"] },
              { id: "field-tags", name: "Tags", type: "multi-select", options: ["Bug", "Feature", "Documentação", "Teste", "Urgente"] },
              { id: "field-date", name: "Data de Entrega", type: "date" },
              { id: "field-completed", name: "Completo", type: "checkbox" },
              { id: "field-number", name: "Pontos", type: "number" },
              { id: "field-location", name: "Localização", type: "location" },
              { id: "field-url", name: "URL", type: "url" },
              { id: "field-email", name: "Email", type: "email" },
              { id: "field-phone", name: "Telefone", type: "phone" },
              { id: "field-description", name: "Descrição", type: "text" }
            ],
            rows: [
              {
                id: "row-1",
                values: {
                  "field-title": "Implementar autenticação de usuários",
                  "field-status": "Em Progresso",
                  "field-priority": "Alta",
                  "field-tags": ["Feature", "Urgente"],
                  "field-date": "2025-10-15",
                  "field-completed": false,
                  "field-number": 8,
                  "field-location": "São Paulo, Brasil",
                  "field-url": "https://example.com/auth",
                  "field-email": "dev@example.com",
                  "field-phone": "+55 11 98765-4321",
                  "field-description": "Sistema de login e registro de usuários"
                }
              },
              {
                id: "row-2",
                values: {
                  "field-title": "Corrigir bug no formulário de contato",
                  "field-status": "Concluído",
                  "field-priority": "Média",
                  "field-tags": ["Bug"],
                  "field-date": "2025-10-10",
                  "field-completed": true,
                  "field-number": 3,
                  "field-location": "Rio de Janeiro, Brasil",
                  "field-url": "https://example.com/contact",
                  "field-email": "support@example.com",
                  "field-phone": "+55 21 91234-5678",
                  "field-description": "Validação de campos não estava funcionando"
                }
              },
              {
                id: "row-3",
                values: {
                  "field-title": "Escrever documentação da API",
                  "field-status": "A Fazer",
                  "field-priority": "Baixa",
                  "field-tags": ["Documentação"],
                  "field-date": "2025-10-20",
                  "field-completed": false,
                  "field-number": 5,
                  "field-location": "Belo Horizonte, Brasil",
                  "field-url": "https://example.com/docs",
                  "field-email": "docs@example.com",
                  "field-phone": "+55 31 99876-5432",
                  "field-description": "Documentar todos os endpoints da API REST"
                }
              },
              {
                id: "row-4",
                values: {
                  "field-title": "Criar testes automatizados",
                  "field-status": "Revisão",
                  "field-priority": "Alta",
                  "field-tags": ["Teste", "Feature"],
                  "field-date": "2025-10-12",
                  "field-completed": false,
                  "field-number": 13,
                  "field-location": "Curitiba, Brasil",
                  "field-url": "https://example.com/tests",
                  "field-email": "qa@example.com",
                  "field-phone": "+55 41 98765-1234",
                  "field-description": "Testes unitários e de integração"
                }
              },
              {
                id: "row-5",
                values: {
                  "field-title": "Otimizar performance do dashboard",
                  "field-status": "Em Progresso",
                  "field-priority": "Média",
                  "field-tags": ["Feature"],
                  "field-date": "2025-10-18",
                  "field-completed": false,
                  "field-number": 8,
                  "field-location": "Porto Alegre, Brasil",
                  "field-url": "https://example.com/dashboard",
                  "field-email": "perf@example.com",
                  "field-phone": "+55 51 99999-8888",
                  "field-description": "Melhorar tempo de carregamento"
                }
              }
            ],
            chartType: "bar",
            chartXAxis: "field-status",
            chartYAxis: "field-number",
            formSettings: {
              enabled: true,
              successMessage: "Obrigado pelo envio!",
              allowMultiple: true
            }
          });

          const viewTypes = [
            { type: 'gallery', name: 'Galeria' },
            { type: 'list', name: 'Lista' },
            { type: 'chart', name: 'Gráfico' },
            { type: 'timeline', name: 'Cronograma' },
            { type: 'map', name: 'Mapa' },
            { type: 'feed', name: 'Feed' },
            { type: 'calendar', name: 'Calendário' },
            { type: 'dashboard', name: 'Dashboard' },
            { type: 'form', name: 'Formulário' },
            { type: 'board', name: 'Quadro' }
          ];

          viewTypes.forEach(({ type, name }) => {
            addView(newDb.id, type, name);
          });

          const { setCurrentDatabase } = useNotionStore.getState();
          setCurrentDatabase(newDb.id);

          console.log('✅ Test database injected successfully!');
          console.log(`📊 Database ID: ${newDb.id}`);
          console.log(`📊 Views created: ${newDb.views?.length || 0}`);
        }
      }, 500);
    }
    
    if (!testBoardExists) {
      console.log('📋 Injecting test board...');
      addBoard();
      setTimeout(() => {
        const newBoard = useNotionStore.getState().boards[useNotionStore.getState().boards.length - 1];
        if (newBoard) {
          console.log('✅ Test board created!');
          console.log(`📋 Board ID: ${newBoard.id}`);
        }
      }, 600);
    }
  }, []);

  return null;
};
