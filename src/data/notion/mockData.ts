import { Board, Label, Member } from '@/types/kanban';

export const defaultLabels: Label[] = [
  { id: 'l1', name: 'Design', color: 'green' },
  { id: 'l2', name: 'Development', color: 'blue' },
  { id: 'l3', name: 'Bug', color: 'red' },
  { id: 'l4', name: 'Feature', color: 'purple' },
  { id: 'l5', name: 'Documentation', color: 'yellow' },
];

export const defaultMembers: Member[] = [
  { id: 'm1', name: 'Ana Silva', initials: 'AS', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: 'm2', name: 'Bruno Costa', initials: 'BC', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: 'm3', name: 'Carlos Santos', initials: 'CS', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: 'm4', name: 'Diana Oliveira', initials: 'DO', avatar: 'https://i.pravatar.cc/150?img=4' },
];

export const initialBoard: Board = {
  id: 'board-1',
  title: 'Projeto de Desenvolvimento',
  lists: [],
  labels: [...defaultLabels],
  background: {
    type: 'color',
    value: '#7c3aed'
  }
};

export const initialBoardWithExamples: Board = {
  id: 'board-example',
  title: 'Exemplo de Quadro',
  labels: [...defaultLabels],
  lists: [
    {
      id: 'list-1',
      title: 'A Fazer',
      cards: [
        {
          id: 'card-1',
          title: 'Implementar sistema de autenticação',
          description: 'Criar fluxo completo de login e registro de usuários',
          labels: [defaultLabels[1], defaultLabels[3]],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          completed: false,
          checklists: [
            {
              id: 'cl1',
              title: 'Tarefas',
              items: [
                { id: 'cli1', text: 'Design das telas', completed: true },
                { id: 'cli2', text: 'Implementação backend', completed: false },
                { id: 'cli3', text: 'Testes', completed: false },
              ],
            },
          ],
          members: [defaultMembers[0], defaultMembers[1]],
          cover: {
            type: 'color',
            value: 'blue',
            size: 'normal',
          },
          attachments: [],
          customFields: [],
          activities: [
            {
              id: 'a1',
              type: 'action',
              user: defaultMembers[0],
              content: 'adicionou este cartão à lista A Fazer',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            },
          ],
        },
        {
          id: 'card-2',
          title: 'Redesign da página inicial',
          labels: [defaultLabels[0]],
          completed: false,
          checklists: [],
          members: [defaultMembers[2]],
          attachments: [],
          customFields: [],
          activities: [],
          location: {
            id: 'loc-1',
            name: 'Escritório Central',
            address: 'Av. Paulista, 1000 - São Paulo, SP',
            latitude: -23.5629,
            longitude: -46.6544,
          },
        },
      ],
    },
    {
      id: 'list-2',
      title: 'Em Progresso',
      cards: [
        {
          id: 'card-3',
          title: 'Corrigir bug no formulário de contato',
          description: 'O formulário não está enviando emails corretamente',
          labels: [defaultLabels[2]],
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          completed: false,
          checklists: [
            {
              id: 'cl2',
              title: 'Verificações',
              items: [
                { id: 'cli4', text: 'Reproduzir o bug', completed: true },
                { id: 'cli5', text: 'Identificar causa raiz', completed: true },
                { id: 'cli6', text: 'Implementar correção', completed: false },
                { id: 'cli7', text: 'Testar solução', completed: false },
              ],
            },
          ],
          members: [defaultMembers[1]],
          cover: {
            type: 'color',
            value: 'red',
            size: 'normal',
          },
          attachments: [],
          customFields: [
            { id: 'cf1', name: 'Prioridade', value: 'Alta', type: 'text', color: 'red' },
          ],
          activities: [],
        },
      ],
    },
    {
      id: 'list-3',
      title: 'Concluído',
      cards: [
        {
          id: 'card-4',
          title: 'Documentação da API',
          labels: [defaultLabels[4]],
          completed: true,
          checklists: [],
          members: [defaultMembers[3]],
          attachments: [],
          customFields: [],
          activities: [],
        },
      ],
    },
  ],
};
