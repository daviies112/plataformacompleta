/**
 * Store Zustand para gerenciamento de estado da Plataforma de Formulários
 * 
 * Este store gerencia:
 * - Lista de formulários
 * - Formulário em edição
 * - Submissões
 * - Configurações
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Formulario,
  CampoFormulario,
  SubmissaoFormulario,
  EstatisticasFormulario,
  FiltrosFormulario,
} from '@/types/formulario';

interface FormularioStore {
  // Estado
  formularios: Formulario[];
  formularioAtual: Formulario | null;
  submissoes: SubmissaoFormulario[];
  estatisticas: Record<string, EstatisticasFormulario>;
  filtros: FiltrosFormulario;
  loading: boolean;
  error: string | null;

  // Ações - Formulários
  setFormularios: (formularios: Formulario[]) => void;
  addFormulario: (formulario: Formulario) => void;
  updateFormulario: (id: string, updates: Partial<Formulario>) => void;
  deleteFormulario: (id: string) => void;
  setFormularioAtual: (formulario: Formulario | null) => void;
  duplicarFormulario: (id: string) => void;

  // Ações - Campos
  addCampo: (formularioId: string, campo: CampoFormulario) => void;
  updateCampo: (formularioId: string, campoId: string, updates: Partial<CampoFormulario>) => void;
  deleteCampo: (formularioId: string, campoId: string) => void;
  reordenarCampos: (formularioId: string, campoIds: string[]) => void;

  // Ações - Submissões
  setSubmissoes: (submissoes: SubmissaoFormulario[]) => void;
  addSubmissao: (submissao: SubmissaoFormulario) => void;
  updateSubmissao: (id: string, updates: Partial<SubmissaoFormulario>) => void;
  deleteSubmissao: (id: string) => void;
  aprovarSubmissao: (id: string) => void;
  rejeitarSubmissao: (id: string) => void;
  arquivarSubmissao: (id: string) => void;

  // Ações - Estatísticas
  setEstatisticas: (formularioId: string, stats: EstatisticasFormulario) => void;
  incrementarVisita: (formularioId: string) => void;
  incrementarSubmissao: (formularioId: string) => void;

  // Ações - Filtros
  setFiltros: (filtros: Partial<FiltrosFormulario>) => void;
  limparFiltros: () => void;

  // Ações - Utilitários
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  limparDados: () => void;
}

const estadoInicial = {
  formularios: [],
  formularioAtual: null,
  submissoes: [],
  estatisticas: {},
  filtros: {
    ordenarPor: 'atualizado_em' as const,
    ordem: 'desc' as const,
    pagina: 1,
    limite: 10,
  },
  loading: false,
  error: null,
};

export const useFormularioStore = create<FormularioStore>()(
  persist(
    (set, get) => ({
      ...estadoInicial,

      // Ações - Formulários
      setFormularios: (formularios) => set({ formularios }),

      addFormulario: (formulario) =>
        set((state) => ({
          formularios: [formulario, ...state.formularios],
        })),

      updateFormulario: (id, updates) =>
        set((state) => ({
          formularios: state.formularios.map((f) =>
            f.id === id
              ? { ...f, ...updates, atualizadoEm: new Date() }
              : f
          ),
          formularioAtual:
            state.formularioAtual?.id === id
              ? { ...state.formularioAtual, ...updates, atualizadoEm: new Date() }
              : state.formularioAtual,
        })),

      deleteFormulario: (id) =>
        set((state) => ({
          formularios: state.formularios.filter((f) => f.id !== id),
          formularioAtual:
            state.formularioAtual?.id === id ? null : state.formularioAtual,
        })),

      setFormularioAtual: (formulario) => set({ formularioAtual: formulario }),

      duplicarFormulario: (id) => {
        const formulario = get().formularios.find((f) => f.id === id);
        if (formulario) {
          const novoFormulario: Formulario = {
            ...formulario,
            id: `form_${Date.now()}`,
            titulo: `${formulario.titulo} (Cópia)`,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
            totalSubmissoes: 0,
            publico: false,
            linkPublico: undefined,
          };
          get().addFormulario(novoFormulario);
        }
      },

      // Ações - Campos
      addCampo: (formularioId, campo) =>
        set((state) => ({
          formularios: state.formularios.map((f) =>
            f.id === formularioId
              ? {
                  ...f,
                  campos: [...f.campos, campo],
                  atualizadoEm: new Date(),
                }
              : f
          ),
        })),

      updateCampo: (formularioId, campoId, updates) =>
        set((state) => ({
          formularios: state.formularios.map((f) =>
            f.id === formularioId
              ? {
                  ...f,
                  campos: f.campos.map((c) =>
                    c.id === campoId ? { ...c, ...updates } : c
                  ),
                  atualizadoEm: new Date(),
                }
              : f
          ),
        })),

      deleteCampo: (formularioId, campoId) =>
        set((state) => ({
          formularios: state.formularios.map((f) =>
            f.id === formularioId
              ? {
                  ...f,
                  campos: f.campos.filter((c) => c.id !== campoId),
                  atualizadoEm: new Date(),
                }
              : f
          ),
        })),

      reordenarCampos: (formularioId, campoIds) =>
        set((state) => ({
          formularios: state.formularios.map((f) => {
            if (f.id !== formularioId) return f;
            const novosIds = new Map(campoIds.map((id, idx) => [id, idx]));
            return {
              ...f,
              campos: f.campos
                .slice()
                .sort((a, b) => (novosIds.get(a.id) ?? 0) - (novosIds.get(b.id) ?? 0))
                .map((c, idx) => ({ ...c, ordem: idx })),
              atualizadoEm: new Date(),
            };
          }),
        })),

      // Ações - Submissões
      setSubmissoes: (submissoes) => set({ submissoes }),

      addSubmissao: (submissao) =>
        set((state) => ({
          submissoes: [submissao, ...state.submissoes],
        })),

      updateSubmissao: (id, updates) =>
        set((state) => ({
          submissoes: state.submissoes.map((s) =>
            s.id === id ? { ...s, ...updates, editadoEm: new Date() } : s
          ),
        })),

      deleteSubmissao: (id) =>
        set((state) => ({
          submissoes: state.submissoes.filter((s) => s.id !== id),
        })),

      aprovarSubmissao: (id) =>
        set((state) => ({
          submissoes: state.submissoes.map((s) =>
            s.id === id ? { ...s, status: 'aprovado' as const } : s
          ),
        })),

      rejeitarSubmissao: (id) =>
        set((state) => ({
          submissoes: state.submissoes.map((s) =>
            s.id === id ? { ...s, status: 'rejeitado' as const } : s
          ),
        })),

      arquivarSubmissao: (id) =>
        set((state) => ({
          submissoes: state.submissoes.map((s) =>
            s.id === id ? { ...s, status: 'arquivado' as const } : s
          ),
        })),

      // Ações - Estatísticas
      setEstatisticas: (formularioId, stats) =>
        set((state) => ({
          estatisticas: {
            ...state.estatisticas,
            [formularioId]: stats,
          },
        })),

      incrementarVisita: (formularioId) =>
        set((state) => {
          const stats = state.estatisticas[formularioId];
          if (!stats) return state;
          return {
            estatisticas: {
              ...state.estatisticas,
              [formularioId]: {
                ...stats,
                totalVisitas: stats.totalVisitas + 1,
              },
            },
          };
        }),

      incrementarSubmissao: (formularioId) =>
        set((state) => {
          const stats = state.estatisticas[formularioId];
          if (!stats) return state;
          return {
            formularios: state.formularios.map((f) =>
              f.id === formularioId
                ? { ...f, totalSubmissoes: f.totalSubmissoes + 1 }
                : f
            ),
            estatisticas: {
              ...state.estatisticas,
              [formularioId]: {
                ...stats,
                totalSubmissoes: stats.totalSubmissoes + 1,
              },
            },
          };
        }),

      // Ações - Filtros
      setFiltros: (filtros) =>
        set((state) => ({
          filtros: { ...state.filtros, ...filtros },
        })),

      limparFiltros: () =>
        set({
          filtros: {
            ordenarPor: 'atualizado_em',
            ordem: 'desc',
            pagina: 1,
            limite: 10,
          },
        }),

      // Ações - Utilitários
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      limparDados: () => set(estadoInicial),
    }),
    {
      name: 'formulario-storage',
      partialize: (state) => ({
        formularios: state.formularios,
        filtros: state.filtros,
      }),
    }
  )
);
