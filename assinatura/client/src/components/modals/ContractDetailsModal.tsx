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
  signed_contract_html?: string;
  protocol_number?: string;
  company_name?: string;
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
      apiRequest('GET', `/api/contracts/by-id/${contract.id}`)
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
    if (!freshContract && !contract) return;
    
    setIsGeneratingPdf(true);
    try {
      const contractData = freshContract || contract;
      
      // Helper function to add page breaks after every 4 clauses
      const addPageBreaksToContract = (html: string): string => {
        // Split by h3 tags (clause titles)
        const parts = html.split(/(<h3[^>]*>.*?<\/h3>)/);
        let clauseCount = 0;
        let result = '';
        
        for (const part of parts) {
          result += part;
          // Check if this is a clause title (h3 containing "CLÁUSULA")
          if (part.includes('<h3') && part.includes('CLÁUSULA')) {
            clauseCount++;
            // Add page break after every 4 clauses
            if (clauseCount % 4 === 0 && clauseCount > 0) {
              result += '<div style="page-break-after: always; margin-bottom: 20px;"></div>';
            }
          }
        }
        
        return result;
      };
      
      // Create complete PDF HTML document with proper sizing
      const pdfHtml = document.createElement('div');
      pdfHtml.id = 'pdf-export-element';
      
      // Set precise A4 dimensions (210mm × 297mm)
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
      
      // Build complete HTML content
      let contentHTML = '';
      
      // Header section (compact - no top margin)
      contentHTML += `
        <div style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #333;">
          <h1 style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">Detalhes do Contrato</h1>
          <p style="margin: 0 0 2px 0; font-size: 12px;"><strong>Protocolo:</strong> ${contractData?.protocol_number || 'N/A'}</p>
          <p style="margin: 0; font-size: 12px;"><strong>Empresa:</strong> ${contractData?.company_name || 'Sem empresa'}</p>
        </div>
      `;
      
      // Personal Information Section (compact)
      contentHTML += `
        <div style="margin: 0 0 15px 0; padding-bottom: 10px;">
          <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">Informações Pessoais</h2>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0; width: 30%;">Nome:</td>
              <td style="color: #333; padding: 3px 0;">${contractData?.client_name || 'N/A'}</td>
            </tr>
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0;">CPF:</td>
              <td style="color: #333; padding: 3px 0;">${contractData?.client_cpf || 'N/A'}</td>
            </tr>
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0;">Email:</td>
              <td style="color: #333; padding: 3px 0;">${contractData?.client_email || 'N/A'}</td>
            </tr>
            <tr style="display: table-row;">
              <td style="font-weight: 600; color: #666; padding: 3px 0;">Telefone:</td>
              <td style="color: #333; padding: 3px 0;">${contractData?.client_phone || 'Não informado'}</td>
            </tr>
          </table>
        </div>
      `;
      
      // Photos Section if available (compact)
      if (contractData?.selfie_photo || contractData?.document_photo) {
        contentHTML += '<div style="margin: 0 0 15px 0; padding-bottom: 10px;">';
        contentHTML += '<h2 style="font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Fotos do Processo</h2>';
        
        if (contractData?.selfie_photo) {
          contentHTML += `
            <div style="margin-bottom: 12px;">
              <p style="font-weight: 600; font-size: 11px; color: #666; margin: 0 0 5px 0;">Selfie do Cliente</p>
              <img src="${contractData.selfie_photo}" style="width: 100%; max-width: 350px; height: auto; border: 1px solid #ddd;" />
            </div>
          `;
        }
        
        if (contractData?.document_photo) {
          contentHTML += `
            <div style="margin-bottom: 12px;">
              <p style="font-weight: 600; font-size: 11px; color: #666; margin: 0 0 5px 0;">Documento</p>
              <img src="${contractData.document_photo}" style="width: 100%; max-width: 350px; height: auto; border: 1px solid #ddd;" />
            </div>
          `;
        }
        
        contentHTML += '</div>';
      }

      // Signed Contract Section with intelligent page breaks - starts on new page
      if (contractData?.signed_contract_html) {
        const optimizedContractHTML = addPageBreaksToContract(contractData.signed_contract_html);
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
      
      // Append to body temporarily for rendering
      document.body.appendChild(pdfHtml);

      const html2pdf = (await import('html2pdf.js')).default;
      
      // Use more robust settings for capturing entire content
      const opt = {
        margin: 0,
        filename: `contrato-${contractData?.client_name}-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
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
          orientation: 'portrait', 
          unit: 'mm', 
          format: 'a4',
          compress: true,
        },
      };

      // Generate PDF with html2pdf
      await html2pdf()
        .set(opt)
        .from(pdfHtml)
        .save();
      
      // Remove temporary element
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

        <div id="contract-details-content" className="space-y-6 bg-white p-6">
          {isLoading && <p className="text-sm text-gray-500">Carregando detalhes...</p>}
          
          {!isLoading && (
            <>
              <Card className="p-4">
                <h3 className="font-bold text-lg mb-3">📋 Informações Pessoais</h3>
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
                    <p className="font-semibold text-gray-600">Telefone:</p>
                    <p className="text-gray-800">{displayContract?.client_phone || 'Não informado'}</p>
                  </div>
                </div>
              </Card>

              {(displayContract?.selfie_photo || displayContract?.document_photo) && (
                <Card className="p-4">
                  <h3 className="font-bold text-lg mb-3">📸 Fotos do Processo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayContract?.selfie_photo && (
                      <div className="space-y-2">
                        <p className="font-semibold text-sm text-gray-600">Selfie do Cliente</p>
                        <img 
                          src={displayContract.selfie_photo} 
                          alt="Selfie" 
                          className="w-full rounded border border-gray-200 max-h-64 object-cover"
                        />
                      </div>
                    )}
                    {displayContract?.document_photo && (
                      <div className="space-y-2">
                        <p className="font-semibold text-sm text-gray-600">Documento</p>
                        <img 
                          src={displayContract.document_photo} 
                          alt="Documento" 
                          className="w-full rounded border border-gray-200 max-h-64 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {displayContract?.signed_contract_html && (
                <Card className="p-4">
                  <h3 className="font-bold text-lg mb-3">✍️ Contrato Assinado</h3>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto text-sm">
                    <div 
                      dangerouslySetInnerHTML={{ __html: displayContract.signed_contract_html }}
                      className="prose prose-sm max-w-none"
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
