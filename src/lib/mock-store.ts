import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, startOfToday } from 'date-fns';

// Types mimicking the DB schema
export type Tenant = {
  id: string;
  nome: string;
  slug: string;
  email: string;
  telefone: string;
  logo_url: string;
  configuracoes: {
    horario_comercial: { inicio: string; fim: string };
    duracao_padrao: number;
    cores: { primaria: string; secundaria: string };
  };
  token_100ms: string; // Management Token
  app_access_key: string;
  app_secret: string;
};

export type User = {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  role: 'admin' | 'user';
  avatar_url?: string;
};

export type Meeting = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  nome: string; // Client name
  email: string;
  telefone: string;
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  status: 'agendada' | 'cancelada' | 'em_andamento' | 'concluida';
  room_id_100ms?: string;
  link_reuniao?: string;
};

// Mock Data
const MOCK_TENANT: Tenant = {
  id: 'tenant-1',
  nome: 'Acme Corp',
  slug: 'acme',
  email: 'contact@acme.com',
  telefone: '+5511999999999',
  logo_url: 'https://placehold.co/150x50?text=Acme',
  configuracoes: {
    horario_comercial: { inicio: '09:00', fim: '18:00' },
    duracao_padrao: 60,
    cores: { primaria: '#3B82F6', secundaria: '#10B981' },
  },
  token_100ms: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NjUzMTQzNDEsImV4cCI6MTc2NTkxOTE0MSwianRpIjoiOGJmOTQ2OTUtY2Y3Zi00OWJjLThlOWQtNzY2M2Q3YTk0MjQ0IiwidHlwZSI6Im1hbmFnZW1lbnQiLCJ2ZXJzaW9uIjoyLCJuYmYiOjE3NjUzMTQzNDEsImFjY2Vzc19rZXkiOiI2OTM4OGVlYmJkMGRhYjVmOWEwMTRiZGUifQ.o8WpTPWahcyNYf4B7JySb7HPAsAQIr_kSaDLLgoiyrE',
  app_access_key: '69388eebbd0dab5f9a014bde',
  app_secret: '••••••••',
};

const MOCK_USER: User = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  nome: 'Admin User',
  email: 'admin@acme.com',
  role: 'admin',
  avatar_url: 'https://github.com/shadcn.png',
};

const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'mtg-1',
    tenant_id: 'tenant-1',
    usuario_id: 'user-1',
    nome: 'Cliente Importante',
    email: 'cliente@email.com',
    telefone: '11999999999',
    titulo: 'Discussão de Projeto',
    data_inicio: addDays(startOfToday(), 1).toISOString(),
    data_fim: addDays(startOfToday(), 1).toISOString(), // Should be +1h logic in real app
    status: 'agendada',
    room_id_100ms: 'room-123',
    link_reuniao: '/reuniao/mtg-1',
  },
  {
    id: 'mtg-2',
    tenant_id: 'tenant-1',
    usuario_id: 'user-1',
    nome: 'Reunião de Equipe',
    email: 'team@acme.com',
    telefone: '',
    titulo: 'Daily Standup',
    data_inicio: startOfToday().toISOString(),
    data_fim: startOfToday().toISOString(),
    status: 'concluida',
    room_id_100ms: 'room-456',
    link_reuniao: '/reuniao/mtg-2',
  },
];

interface AppState {
  user: User | null;
  tenant: Tenant | null;
  meetings: Meeting[];
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
  addMeeting: (meeting: Omit<Meeting, 'id' | 'tenant_id' | 'usuario_id' | 'status'>) => void;
  updateTenantConfig: (config: Tenant['configuracoes']) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: MOCK_USER,
      tenant: MOCK_TENANT,
      meetings: MOCK_MEETINGS,
      isAuthenticated: true,
      login: (email) => {
        // Mock login logic
        if (email) {
          set({
            isAuthenticated: true,
            user: MOCK_USER,
            tenant: MOCK_TENANT,
          });
        }
      },
      logout: () => set({ isAuthenticated: false, user: null, tenant: null }),
      addMeeting: (meetingData) => {
        const newMeeting: Meeting = {
          ...meetingData,
          id: `mtg-${Date.now()}`,
          tenant_id: get().tenant?.id || 'tenant-1',
          usuario_id: get().user?.id || 'user-1',
          status: 'agendada',
          room_id_100ms: `room-${Date.now()}`,
          link_reuniao: `/reuniao/mtg-${Date.now()}`,
        };
        set((state) => ({ meetings: [...state.meetings, newMeeting] }));
      },
      updateTenantConfig: (config) => {
        set((state) => ({
          tenant: state.tenant ? { ...state.tenant, configuracoes: config } : null,
        }));
      },
    }),
    {
      name: 'meetflow-storage',
    }
  )
);
