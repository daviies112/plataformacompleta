import { useState } from 'react';
import { Trash2, Eye, Pencil, FileText, Image as ImageIcon } from 'lucide-react';
import { useAttachments, useDeleteAttachment, type Attachment } from '@/hooks/useAttachments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export function AttachmentsList() {
  const { data: attachments = [], isLoading, error } = useAttachments();
  const deleteMutation = useDeleteAttachment();
  const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2">Carregando anexos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        Erro ao carregar anexos
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum anexo encontrado</p>
        <p className="text-sm">Faça upload de recibos, notas fiscais ou documentos</p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente deletar este anexo?')) return;

    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar anexo');
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(value));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            {attachment.mimeType?.startsWith('image/') && attachment.fileUrl ? (
              <div className="relative aspect-video mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={attachment.fileUrl}
                  alt={attachment.description || 'Anexo'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
            )}

            <h3 className="font-medium truncate mb-2">
              {attachment.description || attachment.fileName}
            </h3>

            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
              {attachment.category && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Categoria:</span>
                  <span>{attachment.category}</span>
                </div>
              )}
              
              {attachment.amount && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Valor:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    {formatCurrency(attachment.amount)}
                  </span>
                </div>
              )}
              
              {attachment.date && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Data:</span>
                  <span>{formatDate(attachment.date)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">Tamanho:</span>
                <span>
                  {attachment.fileSize
                    ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                    : '-'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewingAttachment(attachment)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ver
              </button>
              
              <button
                onClick={() => handleDelete(attachment.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center justify-center px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewingAttachment && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingAttachment(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {viewingAttachment.description || viewingAttachment.fileName}
              </h2>
              <button
                onClick={() => setViewingAttachment(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {viewingAttachment.mimeType?.startsWith('image/') && viewingAttachment.fileUrl ? (
                <img
                  src={viewingAttachment.fileUrl}
                  alt={viewingAttachment.description || 'Anexo'}
                  className="w-full max-h-[60vh] object-contain mx-auto"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Preview não disponível</p>
                    <p className="text-sm text-gray-400 mt-1">{viewingAttachment.mimeType}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <span className="text-sm font-medium text-gray-500">Categoria:</span>
                  <p className="mt-1">{viewingAttachment.category || '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Valor:</span>
                  <p className="mt-1 text-green-600 dark:text-green-400 font-semibold">
                    {formatCurrency(viewingAttachment.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Data:</span>
                  <p className="mt-1">{formatDate(viewingAttachment.date)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Tipo:</span>
                  <p className="mt-1">{viewingAttachment.type || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
