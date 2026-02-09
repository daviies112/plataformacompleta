import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, Camera, X, Check } from 'lucide-react';
import { useUploadAttachment } from '@/hooks/useAttachments';

interface ImageUploaderProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ImageUploader({ onSuccess, onCancel }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAttachment();

  const handleFile = (selectedFile: File) => {
    // Validar que é uma imagem
    if (!selectedFile.type.startsWith('image/')) {
      alert('Por favor, selecione apenas imagens (JPEG, PNG, WebP)');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validar que é uma imagem antes de processar
      if (!droppedFile.type.startsWith('image/')) {
        alert('Por favor, arraste apenas arquivos de imagem');
        return;
      }
      handleFile(droppedFile);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('Selecione uma imagem');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file,
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: file.name,
        type: 'receipt',
      });

      setFile(null);
      setPreview(null);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload. Tente novamente.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-700'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 px-6 py-6 md:py-4 min-h-[88px] md:min-h-0 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:scale-95 transition-all touch-manipulation"
              >
                <Upload className="w-6 h-6" />
                <span className="font-medium">Selecionar Imagem</span>
              </button>
              
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 px-6 py-6 md:py-4 min-h-[88px] md:min-h-0 bg-green-500 text-white rounded-lg hover:bg-green-600 active:scale-95 transition-all touch-manipulation"
              >
                <Camera className="w-6 h-6" />
                <span className="font-medium">Tirar Foto</span>
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ou arraste e solte uma imagem aqui
            </p>
            
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Formatos aceitos: JPEG, PNG, WebP (máx. 10MB)
            </p>
          </div>

          {/* Input para selecionar imagem da galeria - apenas imagens */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Input para tirar foto com a câmera - força uso da câmera traseira */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {preview && (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={handleReset}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📸 A imagem será enviada e processada automaticamente
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 min-h-[48px] bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all touch-manipulation font-medium"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Enviar Imagem
                </>
              )}
            </button>
            
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-3 md:py-2 min-h-[48px] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all touch-manipulation font-medium"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
