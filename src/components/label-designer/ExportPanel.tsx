import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileDown, Printer, Code, Copy } from 'lucide-react';
import { LabelElement } from './types';

interface ExportPanelProps {
  getElements: () => LabelElement[];
  widthMm: number;
  heightMm: number;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  getElements,
  widthMm,
  heightMm,
}) => {
  const [loading, setLoading] = useState(false);
  const [copies, setCopies] = useState(1);

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const elements = getElements();
      
      const response = await axios.post(
        '/api/label-designer/generate-pdf',
        {
          widthMm,
          heightMm,
          elements,
        },
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etiqueta-${widthMm}x${heightMm}mm.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF gerado e baixado com sucesso!');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(error.response?.data?.error || 'Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    setLoading(true);
    try {
      const elements = getElements();
      
      const response = await axios.post(
        '/api/label-designer/generate-pdf',
        {
          widthMm,
          heightMm,
          elements,
        },
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
        
        toast.success('PDF aberto para impressão! Configure sua impressora para melhor resultado.');
        toast.info('Dica: Use "Tamanho real" ou "100%" nas configurações de impressão');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `etiqueta-${widthMm}x${heightMm}mm.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info('Pop-up bloqueado. PDF baixado - abra e imprima manualmente.');
      }
    } catch (error: any) {
      console.error('Error printing PDF:', error);
      toast.error(error.response?.data?.error || 'Erro ao gerar PDF para impressão');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateZPL = async () => {
    setLoading(true);
    try {
      const elements = getElements();
      
      const response = await axios.post('/api/label-designer/generate-zpl', {
        widthMm,
        heightMm,
        elements,
      });

      if (response.data.success) {
        const zplCode = response.data.zpl;
        
        const blob = new Blob([zplCode], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `etiqueta-${widthMm}x${heightMm}mm.zpl`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('ZPL gerado e baixado com sucesso!');
      }
    } catch (error: any) {
      console.error('Error generating ZPL:', error);
      toast.error(error.response?.data?.error || 'Erro ao gerar ZPL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Exportar & Imprimir</CardTitle>
        <CardDescription className="text-xs">
          Impressão universal - funciona com qualquer impressora
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800 font-medium mb-2">
            Impressão Universal via PDF
          </p>
          <p className="text-xs text-green-700">
            Funciona com qualquer impressora (térmica, laser, jato de tinta, AirPrint, Bluetooth). 
            Não requer instalação de software adicional.
          </p>
        </div>

        <Button
          onClick={handlePrintPDF}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Printer className="w-4 h-4 mr-2" />
          {loading ? 'Gerando...' : 'Imprimir Etiqueta'}
        </Button>

        <div className="border-t pt-4">
          <Button
            onClick={handleGeneratePDF}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 mb-2">Para impressoras Zebra:</p>
          <Button
            onClick={handleGenerateZPL}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            <Code className="w-4 h-4 mr-2" />
            Gerar ZPL (Zebra)
          </Button>
        </div>

        <div className="border-t pt-4 bg-gray-50 p-3 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Configurações recomendadas de impressão:
          </p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Tamanho do papel: {widthMm}x{heightMm}mm</li>
            <li>• Escala: 100% (Tamanho real)</li>
            <li>• Margens: Nenhuma</li>
            <li>• Orientação: {widthMm > heightMm ? 'Paisagem' : 'Retrato'}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
