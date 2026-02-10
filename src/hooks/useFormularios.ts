import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface Form {
  id: string;
  title: string;
  description: string | null;
  questions: any;
  passingScore: number;
  scoreTiers: any | null;
  designConfig: any | null;
  completionPageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSubmission {
  id: string;
  formId: string;
  answers: any;
  totalScore: number;
  passed: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  designConfig: any;
  questions: any;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompletionPage {
  id: string;
  name: string;
  title: string;
  subtitle: string | null;
  successMessage: string;
  failureMessage: string;
  showScore: boolean;
  showTierBadge: boolean;
  logo: string | null;
  logoAlign: string;
  successIconColor: string;
  failureIconColor: string;
  successIconImage: string | null;
  failureIconImage: string | null;
  successIconType: string;
  failureIconType: string;
  ctaText: string | null;
  ctaUrl: string | null;
  customContent: string | null;
  designConfig: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormStats {
  totalSubmissions: number;
  passedSubmissions: number;
  failedSubmissions: number;
  passRate: number;
  averageScore: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_URL = '/api';

async function apiFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'An error occurred');
  }

  return response.json();
}

// Forms API
const formsApi = {
  list: (params?: { search?: string; limit?: number; offset?: number }) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([_, v]) => v !== undefined)
    );
    return apiFetch(`${API_URL}/forms?${new URLSearchParams(cleanParams as any).toString()}`);
  },
  get: (id: string) => apiFetch(`${API_URL}/forms/${id}`),
  create: (data: Partial<Form>) => apiFetch(`${API_URL}/forms`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Form>) => apiFetch(`${API_URL}/forms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiFetch(`${API_URL}/forms/${id}`, {
    method: 'DELETE',
  }),
  duplicate: (id: string) => apiFetch(`${API_URL}/forms/${id}/duplicate`, {
    method: 'POST',
  }),
  getStats: (id: string) => apiFetch(`${API_URL}/forms/${id}/stats`),
};

// Submissions API
const submissionsApi = {
  list: (formId: string, params?: { limit?: number; offset?: number }) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([_, v]) => v !== undefined)
    );
    return apiFetch(`${API_URL}/forms/${formId}/submissions?${new URLSearchParams(cleanParams as any).toString()}`);
  },
  get: (id: string) => apiFetch(`${API_URL}/submissions/${id}`),
  submit: (formId: string, data: { answers: any; contactName?: string; contactEmail?: string; contactPhone?: string }) =>
    apiFetch(`${API_URL}/forms/${formId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiFetch(`${API_URL}/submissions/${id}`, {
    method: 'DELETE',
  }),
};

// Templates API
const templatesApi = {
  list: () => apiFetch(`${API_URL}/form-templates`),
  get: (id: string) => apiFetch(`${API_URL}/form-templates/${id}`),
  create: (data: Partial<FormTemplate>) => apiFetch(`${API_URL}/form-templates`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<FormTemplate>) => apiFetch(`${API_URL}/form-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiFetch(`${API_URL}/form-templates/${id}`, {
    method: 'DELETE',
  }),
};

// Completion Pages API
const completionPagesApi = {
  list: () => apiFetch(`${API_URL}/completion-pages`),
  get: (id: string) => apiFetch(`${API_URL}/completion-pages/${id}`),
  create: (data: Partial<CompletionPage>) => apiFetch(`${API_URL}/completion-pages`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<CompletionPage>) => apiFetch(`${API_URL}/completion-pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiFetch(`${API_URL}/completion-pages/${id}`, {
    method: 'DELETE',
  }),
};

// ============================================================================
// REACT QUERY HOOKS - FORMS
// ============================================================================

export function useForms(params?: { search?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['forms', params],
    queryFn: () => formsApi.list(params),
  });
}

export function useForm(id: string | null) {
  return useQuery({
    queryKey: ['forms', id],
    queryFn: () => formsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Form>) => formsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Formulário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar formulário: ${error.message}`);
    },
  });
}

export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Form> }) => formsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['forms', id] });
      toast.success('Formulário atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar formulário: ${error.message}`);
    },
  });
}

export function useDeleteForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => formsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Formulário excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir formulário: ${error.message}`);
    },
  });
}

export function useDuplicateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => formsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Formulário duplicado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao duplicar formulário: ${error.message}`);
    },
  });
}

export function useFormStats(id: string | null) {
  return useQuery({
    queryKey: ['forms', id, 'stats'],
    queryFn: () => formsApi.getStats(id!),
    enabled: !!id,
  });
}

// ============================================================================
// REACT QUERY HOOKS - SUBMISSIONS
// ============================================================================

export function useFormSubmissions(formId: string | null, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['submissions', formId, params],
    queryFn: () => submissionsApi.list(formId!, params),
    enabled: !!formId,
  });
}

export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: ['submissions', id],
    queryFn: () => submissionsApi.get(id!),
    enabled: !!id,
  });
}

export function useSubmitForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, data }: {
      formId: string;
      data: { answers: any; contactName?: string; contactEmail?: string; contactPhone?: string }
    }) => submissionsApi.submit(formId, data),
    onSuccess: (_, { formId }) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', formId, 'stats'] });
      toast.success('Formulário enviado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar formulário: ${error.message}`);
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => submissionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submissão excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir submissão: ${error.message}`);
    },
  });
}

// ============================================================================
// REACT QUERY HOOKS - TEMPLATES
// ============================================================================

export function useFormTemplates() {
  return useQuery({
    queryKey: ['form-templates'],
    queryFn: () => templatesApi.list(),
  });
}

export function useFormTemplate(id: string | null) {
  return useQuery({
    queryKey: ['form-templates', id],
    queryFn: () => templatesApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FormTemplate>) => templatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });
}

export function useUpdateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormTemplate> }) => templatesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['form-templates', id] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });
}

export function useDeleteFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success('Template excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });
}

// ============================================================================
// REACT QUERY HOOKS - COMPLETION PAGES
// ============================================================================

export function useCompletionPages() {
  return useQuery({
    queryKey: ['completion-pages'],
    queryFn: () => completionPagesApi.list(),
  });
}

export function useCompletionPage(id: string | null) {
  return useQuery({
    queryKey: ['completion-pages', id],
    queryFn: () => completionPagesApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateCompletionPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CompletionPage>) => completionPagesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completion-pages'] });
      toast.success('Página de conclusão criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar página de conclusão: ${error.message}`);
    },
  });
}

export function useUpdateCompletionPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompletionPage> }) => completionPagesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['completion-pages'] });
      queryClient.invalidateQueries({ queryKey: ['completion-pages', id] });
      toast.success('Página de conclusão atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar página de conclusão: ${error.message}`);
    },
  });
}

export function useDeleteCompletionPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => completionPagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completion-pages'] });
      toast.success('Página de conclusão excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir página de conclusão: ${error.message}`);
    },
  });
}

// ============================================================================
// REACT QUERY HOOKS - FORMULÁRIOS SELEÇÃO (N8N Integration)
// ============================================================================

export interface FormularioSelecao {
  id: string;
  nome: string;
  url: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateFormularioSelecaoData {
  nome: string;
  url: string;
}

const formulariosSelecaoApi = {
  list: () => apiFetch(`${API_URL}/formularios`),
  getAtivo: async () => {
    try {
      return await apiFetch(`${API_URL}/formularios/ativo`);
    } catch (error) {
      return null;
    }
  },
  create: (data: CreateFormularioSelecaoData) => apiFetch(`${API_URL}/formularios`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  ativar: (id: string) => apiFetch(`${API_URL}/formularios/${id}/ativar`, {
    method: 'PUT',
  }),
  delete: (id: string) => apiFetch(`${API_URL}/formularios/${id}`, {
    method: 'DELETE',
  }),
  update: (id: string, data: Partial<CreateFormularioSelecaoData>) => apiFetch(`${API_URL}/formularios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export function useFormulariosSelecao() {
  return useQuery({
    queryKey: ['formularios-selecao'],
    queryFn: () => formulariosSelecaoApi.list(),
  });
}

export function useFormularioAtivoSelecao() {
  return useQuery({
    queryKey: ['formulario-ativo-selecao'],
    queryFn: () => formulariosSelecaoApi.getAtivo(),
  });
}

export function useCreateFormularioSelecao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFormularioSelecaoData) => formulariosSelecaoApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formularios-selecao'] });
      toast.success('Formulário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar formulário: ${error.message}`);
    },
  });
}

export function useAtivarFormularioSelecao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => formulariosSelecaoApi.ativar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formularios-selecao'] });
      queryClient.invalidateQueries({ queryKey: ['formulario-ativo-selecao'] });
      toast.success('Formulário ativado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar formulário: ${error.message}`);
    },
  });
}

export function useDeleteFormularioSelecao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => formulariosSelecaoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formularios-selecao'] });
      queryClient.invalidateQueries({ queryKey: ['formulario-ativo-selecao'] });
      toast.success('Formulário deletado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar formulário: ${error.message}`);
    },
  });
}

export function useUpdateFormularioSelecao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFormularioSelecaoData> }) =>
      formulariosSelecaoApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formularios-selecao'] });
      queryClient.invalidateQueries({ queryKey: ['formulario-ativo-selecao'] });
      toast.success('Formulário atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar formulário: ${error.message}`);
    },
  });
}

// ============================================================================
// REACT QUERY HOOKS - ACTIVE FORM (APP SETTINGS)
// ============================================================================

const activeFormApi = {
  get: () => apiFetch(`${API_URL}/formularios/config/ativo`),
  set: (formId: string) => apiFetch(`${API_URL}/formularios/config/ativo`, {
    method: 'PUT',
    body: JSON.stringify({ formId }),
  }),
};

export function useActiveForm() {
  return useQuery({
    queryKey: ['active-form'],
    queryFn: () => activeFormApi.get(),
    retry: false,
  });
}

export function useSetActiveForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formId: string) => activeFormApi.set(formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-form'] });
      toast.success('Formulário ativado com sucesso! A seleção foi salva no Supabase.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar formulário: ${error.message}`);
    },
  });
}
