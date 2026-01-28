import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

interface Contract {
  id: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone?: string;
  selfie_photo?: string;
  document_photo?: string;
  document_back_photo?: string;
  residence_proof_photo?: string;
  contract_html?: string;
  signed_contract_html?: string;
  protocol_number?: string;
  company_name?: string;
  created_at?: string;
}

interface ContractDetailsModalProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContractDetailsModal = ({ contract, open, onOpenChange }: ContractDetailsModalProps) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [freshContract, setFreshContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && contract?.id) {
      setIsLoading(true);
      apiRequest('GET', `/api/assinatura/contracts/${contract.id}`)
        .then(res => res.json())
        .then(data => setFreshContract(data))
        .catch(err => {
          console.error('Error fetching contract details:', err);
          setFreshContract(contract);
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, contract?.id]);

  const generatePDF = async () => {
    const contractData = freshContract || contract;
    if (!contractData) return;
    
    setIsGeneratingPdf(true);
    try {
      const addPageBreaksToContract = (html: string): string => {
        if (!html) return '';
        const parts = html.split(/(<h3[^>]*>.*?<\/h3>)/);
        let clauseCount = 0;
        let result = '';
        
        for (const part of parts) {
          result += part;
          if (part.includes('<h3') && part.includes('CLÁUSULA')) {
            clauseCount++;
            if (clauseCount % 4 === 0 && clauseCount > 0) {
              result += '<div style="page-break-after: always; margin-bottom: 20px;"></div>';
            }
          }
        }
        
        return result;
      };
      
      const pdfHtml = document.createElement('div');
      pdfHtml.id = 'pdf-export-element';
      
      pdfHtml.style.width = '210mm';
      pdfHtml.style.height = 'auto';
      pdfHtml.style.padding = '8mm 12mm 12mm 12mm';
      pdfHtml.style.margin = '0';
      pdfHtml.style.boxSizing = 'border-box';
      pdfHtml.style.backgroundColor = '#ffffff';
      pdfHtml.style.fontSize = '11px';
      pdfHtml.style.lineHeight = '1.4';
      pdfHtml.style.color = '#333';
      pdfHtml.style.fontFamily = '"Segoe UI", Arial, sans-serif';
      
      let contentHTML = '';
      
      contentHTML += `
        <div style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #333;">
          <h1 style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">Detalhes do Contrato</h1>
          <p style="margin: 0 0 2px 0; font-size: 12px;"><strong>Protocolo:</strong> ${contractData.protocol_number || 'N/A'}</p>
          <p style="margin: 0; font-size: 12px;"><strong>Empresa:</strong> ${contractData.company_name || 'Sem empresa'}</p>
        </div>
      `;
      
      contentHTML += `
        <div style="margin: 0 0 15px 0; padding-bottom: 10px;">
          <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">Informações Pessoais</h2>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0; width: 30%;">Nome:</td>
              <td style="color: #333; padding: 3px 0;">${contractData.client_name || 'N/A'}</td>
            </tr>
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0;">CPF:</td>
              <td style="color: #333; padding: 3px 0;">${contractData.client_cpf || 'N/A'}</td>
            </tr>
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0;">Email:</td>
              <td style="color: #333; padding: 3px 0;">${contractData.client_email || 'N/A'}</td>
            </tr>
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0;">Telefone:</td>
              <td style="color: #333; padding: 3px 0;">${contractData.client_phone || 'Não informado'}</td>
            </tr>
          </table>
        </div>
      `;
      
      if (contractData.selfie_photo || contractData.document_photo || contractData.document_back_photo || contractData.residence_proof_photo) {
        contentHTML += '<div style="margin: 0 0 15px 0; padding-bottom: 10px;">';
        contentHTML += '<h2 style="font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Fotos do Processo</h2>';
        
        if (contractData.selfie_photo) {
          contentHTML += `
            <div style="margin-bottom: 12px;">
              <p style="font-weight: 600; font-size: 11px; color: #666; margin: 0 0 5px 0;">Selfie do Cliente</p>
              <img src="${contractData.selfie_photo}" style="width: 100%; max-width: 350px; height: auto; border: 1px solid #ddd;" />
            </div>
          `;
        }
        
        if (contractData.document_photo) {
          contentHTML += `
            <div style="margin-bottom: 12px;">
              <p style="font-weight: 600; font-size: 11px; color: #666; margin: 0 0 5px 0;">Documento (Frente)</p>
              <img src="${contractData.document_photo}" style="width: 100%; max-width: 350px; height: auto; border: 1px solid #ddd;" />
            </div>
          `;
        }

        if (contractData.document_back_photo) {
          contentHTML += `
            <div style="margin-bottom: 12px;">
              <p style="font-weight: 600; font-size: 11px; color: #666; margin: 0 0 5px 0;">Documento (Verso)</p>
              <img src="${contractData.document_back_photo}" style="width: 100%; max-width: 350px; height: auto; border: 1px solid #ddd;" />
            </div>
          `;
        }

        if (contractData.residence_proof_photo) {
          contentHTML += `
            <div style="margin-bottom: 12px;">
              <p style="font-weight: 600; font-size: 11px; color: #666; margin: 0 0 5px 0;">Comprovante de Residência</p>
              <img src="${contractData.residence_proof_photo}" style="width: 100%; max-width: 350px; height: auto; border: 1px solid #ddd;" />
            </div>
          `;
        }
        
        contentHTML += '</div>';
      }

      const finalHtml = contractData.signed_contract_html || contractData.contract_html;
      if (finalHtml) {
        const optimizedContractHTML = addPageBreaksToContract(finalHtml);
        contentHTML += `
          <div style="page-break-before: always; margin: 0; padding-top: 0;">
            <h2 style="font-size: 12px; font-weight: bold; margin: 0 0 6px 0;">Contrato Assinado</h2>
            <div style="font-size: 10px; line-height: 1.3; color: #333;">
              ${optimizedContractHTML}
            </div>
          </div>
        `;
      }
      
      pdfHtml.innerHTML = contentHTML;
      document.body.appendChild(pdfHtml);

      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 0,
        filename: `contrato-${contractData.client_name}-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.95 },
        html2canvas: { 
          scale: 3,
          useCORS: true,
          allowTaint: true,
          imageTimeout: 0,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: document.body.scrollHeight,
        },
        jsPDF: { 
          orientation: 'portrait' as const, 
          unit: 'mm' as const, 
          format: 'a4',
          compress: true,
        },
      };

      await html2pdf().set(opt).from(pdfHtml).save();
      document.body.removeChild(pdfHtml);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!contract && !freshContract) return null;
  
  const displayContract = freshContract || contract;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <DialogTitle>Detalhes do Contrato</DialogTitle>
            <DialogDescription>
              {displayContract?.protocol_number} - {displayContract?.company_name || 'Sem empresa'}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={generatePDF} disabled={isGeneratingPdf} size="sm" className="gap-2 whitespace-nowrap">
              <Download className="w-4 h-4" />
              {isGeneratingPdf ? 'Gerando...' : 'PDF'}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div id="contract-details-content" className="space-y-6 bg-white p-6 text-black">
          {isLoading && <p className="text-sm text-gray-500">Carregando detalhes...</p>}
          
          {!isLoading && (
            <>
              <Card className="p-4">
                <h3 className="font-bold text-lg mb-3">Informações Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-600">Nome:</p>
                    <p className="text-gray-800">{displayContract?.client_name}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">CPF:</p>
                    <p className="text-gray-800">{displayContract?.client_cpf}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Email:</p>
                    <p className="text-gray-800">{displayContract?.client_email}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Protocolo:</p>
                    <p className="text-gray-800 font-mono">{displayContract?.protocol_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Empresa:</p>
                    <p className="text-gray-800">{displayContract?.company_name || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              {(displayContract?.selfie_photo || displayContract?.document_photo || displayContract?.document_back_photo || displayContract?.residence_proof_photo) && (
                <Card className="p-4">
                  <h3 className="font-bold text-lg mb-3">Fotos do Processo</h3>
                  <div className="flex flex-wrap gap-4">
                    {displayContract?.selfie_photo && (
                      <div className="space-y-2 flex-1 min-w-[200px]">
                        <p className="font-semibold text-sm text-gray-600">Selfie do Cliente</p>
                        <div className="bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center min-h-[200px]">
                          <img 
                            src={displayContract.selfie_photo} 
                            alt="Selfie" 
                            className="max-w-full max-h-64 object-contain"
                            crossOrigin="anonymous"
                            loading="lazy"
                            onLoad={() => console.log('Selfie loaded successfully')}
                            onError={(e) => {
                              console.error('Error loading selfie:', e);
                              const target = e.target as HTMLImageElement;
                              // Try forcing a reload with timestamp if it failed
                              if (!target.src.includes('t=')) {
                                target.src = displayContract.selfie_photo + (displayContract.selfie_photo?.includes('?') ? '&' : '?') + 't=' + Date.now();
                              } else if (!target.src.includes('placeholder')) {
                                target.src = 'https://placehold.co/400x300?text=Erro+no+carregamento';
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {displayContract?.document_photo && (
                      <div className="space-y-2 flex-1 min-w-[200px]">
                        <p className="font-semibold text-sm text-gray-600">Documento (Frente)</p>
                        <div className="bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center min-h-[200px]">
                          <img 
                            src={displayContract.document_photo} 
                            alt="Documento Frente" 
                            className="max-w-full max-h-64 object-contain"
                            crossOrigin="anonymous"
                            loading="lazy"
                            onLoad={() => console.log('Doc Front loaded successfully')}
                            onError={(e) => {
                              console.error('Error loading front document:', e);
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('t=')) {
                                target.src = displayContract.document_photo + (displayContract.document_photo?.includes('?') ? '&' : '?') + 't=' + Date.now();
                              } else if (!target.src.includes('placeholder')) {
                                target.src = 'https://placehold.co/400x300?text=Erro+no+carregamento';
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {displayContract?.document_back_photo && (
                      <div className="space-y-2 flex-1 min-w-[200px]">
                        <p className="font-semibold text-sm text-gray-600">Documento (Verso)</p>
                        <div className="bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center min-h-[200px]">
                          <img 
                            src={displayContract.document_back_photo} 
                            alt="Documento Verso" 
                            className="max-w-full max-h-64 object-contain"
                            crossOrigin="anonymous"
                            loading="lazy"
                            onLoad={() => console.log('Doc Back loaded successfully')}
                            onError={(e) => {
                              console.error('Error loading back document:', e);
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('t=')) {
                                target.src = displayContract.document_back_photo + (displayContract.document_back_photo?.includes('?') ? '&' : '?') + 't=' + Date.now();
                              } else if (!target.src.includes('placeholder')) {
                                target.src = 'https://placehold.co/400x300?text=Erro+no+carregamento';
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {displayContract?.residence_proof_photo && (
                      <div className="space-y-2 flex-1 min-w-[200px]">
                        <p className="font-semibold text-sm text-gray-600">Comprovante de Residência</p>
                        <div className="bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center min-h-[200px]">
                          <img 
                            src={displayContract.residence_proof_photo} 
                            alt="Comprovante de Residência" 
                            className="max-w-full max-h-64 object-contain"
                            crossOrigin="anonymous"
                            loading="lazy"
                            onLoad={() => console.log('Residence proof loaded successfully')}
                            onError={(e) => {
                              console.error('Error loading residence proof:', e);
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('t=')) {
                                target.src = displayContract.residence_proof_photo + (displayContract.residence_proof_photo?.includes('?') ? '&' : '?') + 't=' + Date.now();
                              } else if (!target.src.includes('placeholder')) {
                                target.src = 'https://placehold.co/400x300?text=Erro+no+carregamento';
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {(displayContract?.signed_contract_html || displayContract?.contract_html) && (
                <Card className="p-4">
                  <h3 className="font-bold text-lg mb-3">Contrato Assinado</h3>
                  <div className="bg-white p-4 rounded border border-gray-200 text-sm overflow-visible text-black">
                    {/* Debug indicator */}
                    <div className="text-[10px] text-gray-400 mb-2 border-b pb-1 flex gap-2">
                      <span>Status: {displayContract?.signed_contract_html ? 'Assinado' : 'Rascunho'}</span>
                      <span>| Protocolo: {displayContract?.protocol_number}</span>
                    </div>
                    <div 
                      dangerouslySetInnerHTML={{ __html: displayContract?.signed_contract_html || displayContract?.contract_html || '' }}
                      className="prose prose-sm max-w-none text-black"
                      style={{ color: 'black' }}
                    />
                  </div>
                </Card>
              )}
            </>
          )}
        </div>


        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
