import { useState, useMemo } from 'react';
import { Plus, FileText, Sparkles, Camera, PenLine } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSupabaseFiles } from '@/hooks/useSupabaseFiles';
import { useFiles } from '@/hooks/useFiles';
import SupabaseFilesTable from '@/components/SupabaseFilesTable';
import { useUploadAttachment } from '@/hooks/useAttachments';
import AttachmentsFilters, { FilterOptions } from '@/components/AttachmentsFilters';
import { SupabaseFile } from '@/hooks/useSupabaseFiles';
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

// Helper function para parsing robusto de valores monetários
function parseAmount(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Se já é número, retorna (incluindo zero)
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  // Converter para string e limpar símbolos de moeda
  let cleanValue = String(value)
    .trim()
    .replace(/[R$\s€£¥]/g, '');
  
  // Contar separadores
  const commaCount = (cleanValue.match(/,/g) || []).length;
  const dotCount = (cleanValue.match(/\./g) || []).length;
  
  if (commaCount > 0 && dotCount > 0) {
    // Ambos presentes: o último é decimal, os anteriores são milhares
    const lastCommaIndex = cleanValue.lastIndexOf(',');
    const lastDotIndex = cleanValue.lastIndexOf('.');
    
    if (lastCommaIndex > lastDotIndex) {
      // Vírgula é decimal (formato BR: 1.234,56)
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else {
      // Ponto é decimal (formato US: 1,234.56)
      cleanValue = cleanValue.replace(/,/g, '');
    }
  } else if (commaCount > 1) {
    // Múltiplas vírgulas: são milhares, sem decimal (1,234,567)
    cleanValue = cleanValue.replace(/,/g, '');
  } else if (dotCount > 1) {
    // Múltiplos pontos: são milhares, sem decimal (1.234.567)
    cleanValue = cleanValue.replace(/\./g, '');
  } else if (commaCount === 1) {
    // Uma vírgula: verificar se é decimal (1-2 dígitos após) ou milhar (3+ dígitos após)
    const parts = cleanValue.split(',');
    if (parts[1] && parts[1].length <= 2) {
      // Decimal (1,5 ou 1,50)
      cleanValue = cleanValue.replace(',', '.');
    } else {
      // Milhar (1,234)
      cleanValue = cleanValue.replace(',', '');
    }
  } else if (dotCount === 1) {
    // Um ponto: verificar se é decimal (1-2 dígitos após) ou milhar (3+ dígitos após)
    const parts = cleanValue.split('.');
    if (parts[1] && parts[1].length <= 2) {
      // Decimal (1.5 ou 1.50) - já está no formato correto
      // Nada a fazer
    } else {
      // Milhar (1.234)
      cleanValue = cleanValue.replace('.', '');
    }
  }
  
  const parsed = parseFloat(cleanValue);
  return (isNaN(parsed) || !isFinite(parsed)) ? null : parsed;
}

export default function Attachments() {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const { data: supabaseFiles = [] } = useSupabaseFiles();
  const { data: localFiles = [] } = useFiles();
  const uploadMutation = useUploadAttachment();
  const queryClient = useQueryClient();

  // Filtros
  const [filters, setFilters] = useState<FilterOptions>({
    searchText: '',
    type: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Combinar arquivos locais e do Supabase em uma única lista
  const allFiles = useMemo(() => {
    return [
      ...localFiles.map(file => {
        const dateValue = file.date || file.createdAt;
        const updatedValue = file.updatedAt || file.createdAt;
        
        return {
          id: file.id,
          type: file.storageType === 'manual' ? ('manual' as const) : ('receipt' as const),
          category: file.category ?? undefined,
          amount: file.amount ?? undefined,
          created_at: typeof dateValue === 'string' ? dateValue : (dateValue instanceof Date ? dateValue.toISOString() : new Date().toISOString()),
          updated_at: typeof updatedValue === 'string' ? updatedValue : (updatedValue instanceof Date ? updatedValue.toISOString() : new Date().toISOString()),
          due_date: undefined,
          establishment: file.description ?? undefined,
          description: file.fileName ?? undefined,
          file_name: file.fileName,
          file_url: file.fileUrl,
        };
      }),
      ...supabaseFiles,
    ];
  }, [localFiles, supabaseFiles]);

  // Extrair categorias únicas
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    allFiles.forEach(file => {
      if (file.category) cats.add(file.category);
    });
    return Array.from(cats).sort();
  }, [allFiles]);

  // Aplicar filtros e ordenação
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...allFiles];

    // Filtro por texto (descrição ou estabelecimento)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(file => {
        const description = (file.description || '').toLowerCase();
        const establishment = (file.establishment || '').toLowerCase();
        return description.includes(searchLower) || establishment.includes(searchLower);
      });
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      result = result.filter(file => file.type === filters.type);
    }

    // Filtro por categoria
    if (filters.category !== 'all') {
      result = result.filter(file => file.category === filters.category);
    }

    // Filtro por data inicial
    if (filters.dateFrom) {
      const fromDate = parseISO(filters.dateFrom);
      result = result.filter(file => {
        if (!file.created_at) return false;
        const fileDate = parseISO(file.created_at);
        return isAfter(fileDate, fromDate) || isEqual(fileDate, fromDate);
      });
    }

    // Filtro por data final
    if (filters.dateTo) {
      const toDate = parseISO(filters.dateTo);
      result = result.filter(file => {
        if (!file.created_at) return false;
        const fileDate = parseISO(file.created_at);
        return isBefore(fileDate, toDate) || isEqual(fileDate, toDate);
      });
    }

    // Filtro por valor mínimo
    if (filters.amountFrom !== '') {
      const minAmount = parseAmount(filters.amountFrom);
      if (minAmount !== null) {
        result = result.filter(file => {
          const fileAmount = parseAmount(file.amount);
          return fileAmount !== null && fileAmount >= minAmount;
        });
      }
    }

    // Filtro por valor máximo
    if (filters.amountTo !== '') {
      const maxAmount = parseAmount(filters.amountTo);
      if (maxAmount !== null) {
        result = result.filter(file => {
          const fileAmount = parseAmount(file.amount);
          return fileAmount !== null && fileAmount <= maxAmount;
        });
      }
    }

    // Ordenação
    result.sort((a, b) => {
      let compareValue = 0;
      let skipOrderInversion = false;

      switch (filters.sortBy) {
        case 'date':
          const dateA = a.created_at ? parseISO(a.created_at).getTime() : 0;
          const dateB = b.created_at ? parseISO(b.created_at).getTime() : 0;
          compareValue = dateA - dateB;
          break;

        case 'amount':
          const amountA = parseAmount(a.amount);
          const amountB = parseAmount(b.amount);
          
          // Colocar valores ausentes/inválidos sempre no final, independente da ordem
          if (amountA === null && amountB === null) {
            compareValue = 0;
            skipOrderInversion = true;
          } else if (amountA === null) {
            compareValue = 1; // A vai para o final
            skipOrderInversion = true;
          } else if (amountB === null) {
            compareValue = -1; // B vai para o final
            skipOrderInversion = true;
          } else {
            // Ambos válidos: comparação normal
            compareValue = amountA - amountB;
          }
          break;

        case 'category':
          const catA = a.category ?? '';
          const catB = b.category ?? '';
          compareValue = catA.localeCompare(catB);
          break;
      }

      // Inverter ordem se necessário (exceto quando skipOrderInversion = true)
      if (skipOrderInversion) {
        return compareValue;
      }
      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [allFiles, filters]);

  // Estado para entrada manual
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !category || !amount) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/files/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          date,
          dueDate: dueDate || undefined,
          description,
          url: url || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar');
      }

      const result = await response.json();
      console.log('✅ Entrada manual salva:', result);

      // Limpar formulário
      setCategory('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setDescription('');
      setUrl('');
      setIsManualModalOpen(false);
      
      // Atualizar dados sem recarregar a página
      await queryClient.invalidateQueries({ queryKey: ['supabase-files'] });
      await queryClient.invalidateQueries({ queryKey: ['files'] });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Documentos Financeiros
          </h1>
          <p className="text-xl text-muted-foreground/80 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Anexe fotos ou adicione informações manualmente
          </p>
        </div>

        <div className="flex gap-3" data-tour="attachments-upload">
          <Button
            onClick={() => setIsImageModalOpen(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
          >
            <Camera className="w-5 h-5" />
            Anexar Foto
          </Button>
          
          <Button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
          >
            <PenLine className="w-5 h-5" />
            Adicionar Manual
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <AttachmentsFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={uniqueCategories}
      />

      {/* Tabela unificada com todos os documentos financeiros filtrados */}
      <SupabaseFilesTable files={filteredAndSortedFiles} />

      {/* Modal para Anexar Foto/Imagem */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Anexar Foto ou Imagem
            </DialogTitle>
          </DialogHeader>
          
          <ImageUploader
            onSuccess={() => {
              setIsImageModalOpen(false);
            }}
            onCancel={() => setIsImageModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para Adicionar Informação Manual */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              Adicionar Informação Manual
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="">Selecione...</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Supermercado">Supermercado</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Educação">Educação</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vencimento (opcional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descrição *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Descrição da despesa"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL (opcional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/documento"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Link para documento externo ou nota fiscal (aparecerá na coluna Ações)
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allow transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Salvar Informação
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
