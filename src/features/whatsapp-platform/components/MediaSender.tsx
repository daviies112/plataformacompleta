import { useState, useRef } from "react";
import { Image as ImageIcon, Video, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MediaSenderProps {
  onSendMedia: (mediaData: {
    mediatype: 'image' | 'video' | 'document';
    mimetype: string;
    media: string;
    caption?: string;
    fileName?: string;
  }) => Promise<void>;
  disabled?: boolean;
}

export default function MediaSender({ onSendMedia, disabled }: MediaSenderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 16MB)
    if (file.size > 16 * 1024 * 1024) {
      alert("Arquivo muito grande! Máximo 16MB");
      return;
    }

    setSelectedFile(file);

    // Criar preview para imagem/vídeo
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    setIsOpen(true);
  };

  const handleSend = async () => {
    if (!selectedFile) return;

    try {
      setIsSending(true);

      // Converter arquivo para base64
      const base64 = await fileToBase64(selectedFile);

      // Determinar tipo de mídia
      let mediatype: 'image' | 'video' | 'document';
      if (selectedFile.type.startsWith('image/')) {
        mediatype = 'image';
      } else if (selectedFile.type.startsWith('video/')) {
        mediatype = 'video';
      } else {
        mediatype = 'document';
      }

      await onSendMedia({
        mediatype,
        mimetype: selectedFile.type,
        media: base64,
        caption: caption || undefined,
        fileName: selectedFile.name,
      });

      // Limpar e fechar
      handleClose();
    } catch (error) {
      console.error("Erro ao enviar mídia:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remover o prefixo "data:image/png;base64," etc
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <>
      {/* Botões de Upload */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = 'image/*';
              fileInputRef.current.click();
            }
          }}
          disabled={disabled}
          title="Enviar imagem"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = 'video/*';
              fileInputRef.current.click();
            }
          }}
          disabled={disabled}
          title="Enviar vídeo"
        >
          <Video className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
              fileInputRef.current.click();
            }
          }}
          disabled={disabled}
          title="Enviar documento"
        >
          <FileText className="h-5 w-5" />
        </Button>
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Dialog de Preview e Legenda */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Arquivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {preview && selectedFile?.type.startsWith('image/') && (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto max-h-[300px] object-contain rounded-lg"
              />
            )}

            {preview && selectedFile?.type.startsWith('video/') && (
              <video
                src={preview}
                controls
                className="w-full h-auto max-h-[300px] rounded-lg"
              />
            )}

            {selectedFile && !preview && (
              <div className="p-4 bg-gray-100 rounded-lg text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            {/* Campo de legenda */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Legenda (opcional)
              </label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Adicione uma legenda..."
                disabled={isSending}
              />
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedFile || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
