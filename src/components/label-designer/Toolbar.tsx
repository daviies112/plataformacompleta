import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Type, Image, Barcode, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ToolbarProps {
  onAddText: () => void;
  onAddImage: (file: File) => void;
  onAddBarcode: () => void;
  onAddQRCode: () => void;
  onDeleteSelected: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddText,
  onAddImage,
  onAddBarcode,
  onAddQRCode,
  onDeleteSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }
      onAddImage(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-sm border">
      <h3 className="w-full text-sm font-semibold text-gray-700 mb-2">Adicionar Elementos</h3>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onAddText}
        className="flex items-center gap-2"
      >
        <Type className="w-4 h-4" />
        Texto
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2"
      >
        <Image className="w-4 h-4" />
        Imagem
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={onAddBarcode}
        className="flex items-center gap-2"
      >
        <Barcode className="w-4 h-4" />
        Código de Barras
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddQRCode}
        className="flex items-center gap-2"
      >
        <QrCode className="w-4 h-4" />
        QR Code
      </Button>

      <div className="border-l mx-2" />

      <Button
        variant="destructive"
        size="sm"
        onClick={onDeleteSelected}
        className="flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Deletar
      </Button>
    </div>
  );
};
