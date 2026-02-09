import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Attachment {
  id: string;
  userId?: string | null;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  category?: string | null;
  amount?: string | null;
  date?: string | null;
  description?: string | null;
  metadata?: any;
  status: string;
  processingStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Hook para listar todos os anexos
export function useAttachments() {
  return useQuery({
    queryKey: ['attachments'],
    queryFn: async (): Promise<Attachment[]> => {
      console.log('📎 useAttachments: Buscando anexos...');
      
      const response = await fetch('/api/attachments');
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar anexos: ${response.statusText}`);
      }
      
      const attachments = await response.json();
      console.log(`✅ ${attachments.length} anexo(s) carregados`);
      
      return attachments;
    },
    staleTime: Infinity,
  });
}

// Hook para fazer upload de anexo
export function useUploadAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      file: File;
      category?: string;
      amount?: string;
      date?: string;
      description?: string;
      type?: string;
    }) => {
      console.log('📤 Fazendo upload:', data.file.name);
      
      const formData = new FormData();
      formData.append('file', data.file);
      
      if (data.category) formData.append('category', data.category);
      if (data.amount) formData.append('amount', data.amount);
      if (data.date) formData.append('date', data.date);
      if (data.description) formData.append('description', data.description);
      if (data.type) formData.append('type', data.type);
      
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao fazer upload');
      }
      
      const result = await response.json();
      console.log('✅ Upload concluído:', result.attachment.id);
      
      return result.attachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

// Hook para deletar anexo
export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      console.log('🗑️ Deletando anexo:', attachmentId);
      
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar anexo');
      }
      
      const result = await response.json();
      console.log('✅ Anexo deletado');
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

// Hook para atualizar metadados do anexo
export function useUpdateAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      id: string;
      category?: string;
      amount?: string;
      date?: string;
      description?: string;
      type?: string;
    }) => {
      console.log('✏️ Atualizando anexo:', data.id);
      
      const response = await fetch(`/api/attachments/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: data.category,
          amount: data.amount,
          date: data.date,
          description: data.description,
          type: data.type,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar anexo');
      }
      
      const result = await response.json();
      console.log('✅ Anexo atualizado');
      
      return result.attachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
