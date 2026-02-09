import { useState } from 'react';
import { Eye, FileText, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useFiles, type File } from '@/hooks/useFiles';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export function FilesList() {
  const { data: files = [], isLoading, error } = useFiles();
  const [viewingFile, setViewingFile] = useState<File | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2">Carregando documentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        Erro ao carregar documentos
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum documento encontrado</p>
        <p className="text-sm">Faça upload de recibos, notas fiscais ou documentos financeiros</p>
        <p className="text-xs mt-2 text-blue-500">Os documentos serão processados automaticamente pela IA</p>
      </div>
    );
  }

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

  const getProcessingStatus = (status: string | null) => {
    switch (status) {
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', label: 'Processado pela IA' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', label: 'Aguardando processamento' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-500', label: 'Falha no processamento' };
      case 'error':
        return { icon: AlertCircle, color: 'text-orange-500', label: 'Erro no processamento' };
      default:
        return { icon: Clock, color: 'text-gray-500', label: 'Status desconhecido' };
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => {
          const status = getProcessingStatus(file.n8nProcessed);
          const StatusIcon = status.icon;
          const n8nData = file.n8nData as any;

          return (
            <div
              key={file.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              {file.mimeType?.startsWith('image/') && file.fileUrl ? (
                <div className="relative aspect-video mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={file.fileUrl}
                    alt={file.description || 'Documento'}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute top-2 right-2 ${status.color} bg-white dark:bg-gray-900 rounded-full p-1.5`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center relative">
                  <FileText className="w-12 h-12 text-gray-400" />
                  <div className={`absolute top-2 right-2 ${status.color} bg-white dark:bg-gray-900 rounded-full p-1.5`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                </div>
              )}

              <h3 className="font-medium truncate mb-2">
                {n8nData?.description || file.description || file.fileName}
              </h3>

              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                {(n8nData?.document_type || n8nData?.category || file.category) && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tipo:</span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {n8nData?.document_type || n8nData?.category || file.category}
                    </span>
                  </div>
                )}
                
                {(n8nData?.total_amount || file.amount) && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Valor:</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {formatCurrency(n8nData?.total_amount || file.amount)}
                    </span>
                  </div>
                )}
                
                {(n8nData?.date || file.date) && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Data:</span>
                    <span>{formatDate(n8nData?.date || file.date)}</span>
                  </div>
                )}

                {n8nData?.beneficiary && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Beneficiário:</span>
                    <span className="truncate">{n8nData.beneficiary}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                  <StatusIcon className={`w-3 h-3 ${status.color}`} />
                  <span className={status.color}>{status.label}</span>
                </div>
              </div>

              <button
                onClick={() => setViewingFile(file)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ver Detalhes
              </button>
            </div>
          );
        })}
      </div>

      {viewingFile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingFile(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-lg font-semibold">
                {(viewingFile.n8nData as any)?.description || viewingFile.description || viewingFile.fileName}
              </h2>
              <button
                onClick={() => setViewingFile(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {viewingFile.mimeType?.startsWith('image/') && viewingFile.fileUrl ? (
                    <img
                      src={viewingFile.fileUrl}
                      alt={viewingFile.description || 'Documento'}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <FileText className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">Preview não disponível</p>
                        <p className="text-sm text-gray-400 mt-1">{viewingFile.mimeType}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const status = getProcessingStatus(viewingFile.n8nProcessed);
                        const StatusIcon = status.icon;
                        return (
                          <>
                            <StatusIcon className={`w-5 h-5 ${status.color}`} />
                            <span className={`font-medium ${status.color}`}>{status.label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {viewingFile.n8nData && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h3 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">📊 Dados Extraídos pela IA</h3>
                      <div className="space-y-2">
                        {Object.entries(viewingFile.n8nData as any).map(([key, value]) => {
                          if (value === null || value === undefined || value === '') return null;
                          
                          const formatKey = (k: string) => {
                            const labels: Record<string, string> = {
                              document_type: 'Tipo de Documento',
                              total_amount: 'Valor Total',
                              date: 'Data',
                              due_date: 'Data de Vencimento',
                              beneficiary: 'Beneficiário',
                              payer: 'Pagador',
                              barcode: 'Código de Barras',
                              pix_key: 'Chave PIX',
                              description: 'Descrição',
                              category: 'Categoria',
                              banco: 'Banco',
                              agencia: 'Agência',
                              conta: 'Conta',
                              additional_info: 'Informações Adicionais',
                            };
                            return labels[k] || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          };

                          const formatValue = (v: any) => {
                            if (typeof v === 'object') return JSON.stringify(v, null, 2);
                            if (key.includes('amount') || key.includes('valor')) return formatCurrency(String(v));
                            if (key.includes('date') || key.includes('data')) return formatDate(String(v));
                            return String(v);
                          };

                          return (
                            <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {formatKey(key)}:
                              </span>
                              <p className="mt-1 text-gray-900 dark:text-gray-100">
                                {formatValue(value)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold mb-3">📁 Informações do Arquivo</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Nome do arquivo:</span>
                        <p className="mt-1">{viewingFile.fileName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Tamanho:</span>
                        <p className="mt-1">
                          {viewingFile.fileSize ? `${(viewingFile.fileSize / 1024).toFixed(1)} KB` : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Tipo:</span>
                        <p className="mt-1">{viewingFile.mimeType || '-'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Upload:</span>
                        <p className="mt-1">
                          {viewingFile.createdAt 
                            ? format(new Date(viewingFile.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
