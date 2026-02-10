import { useQuery } from '@tanstack/react-query';

export interface File {
  id: string;
  userId: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  category: string | null;
  amount: string | null;
  date: string | null;
  description: string | null;
  n8nProcessed: string | null;
  n8nData: any;
  storageType: string | null;
  supabasePath: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useFiles() {
  return useQuery<File[]>({
    queryKey: ['files'],
    queryFn: async () => {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error('Erro ao buscar arquivos');
      }
      return response.json();
    },
  });
}
