import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  onRemove?: () => void;
}

export const MobileImageUpload = ({ value, onChange, onRemove }: MobileImageUploadProps) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraBackInputRef = useRef<HTMLInputElement>(null);
  const cameraFrontInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas imagens');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande! Máximo 5MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onChange(base64);
        toast.success('Imagem carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    }
  };

  const handleRemove = () => {
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraBackInputRef.current) cameraBackInputRef.current.value = '';
    if (cameraFrontInputRef.current) cameraFrontInputRef.current.value = '';
    onRemove?.();
    toast.success('Imagem removida');
  };

  return (
    <div className="flex justify-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700">
          {value ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {value ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 rounded-full shadow-lg w-8 h-8"
            onClick={handleRemove}
            data-testid="button-remove-image"
          >
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full shadow-lg"
                data-testid="button-upload-image"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="text-center">Adicionar Foto</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3 py-6">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 gap-3 text-base"
                  onClick={() => cameraBackInputRef.current?.click()}
                  data-testid="button-camera-back"
                >
                  <Camera className="w-5 h-5" />
                  Tirar Foto (Câmera Traseira)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 gap-3 text-base"
                  onClick={() => cameraFrontInputRef.current?.click()}
                  data-testid="button-camera-front"
                >
                  <Camera className="w-5 h-5" />
                  Tirar Selfie (Câmera Frontal)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 gap-3 text-base"
                  onClick={() => galleryInputRef.current?.click()}
                  data-testid="button-gallery"
                >
                  <ImageIcon className="w-5 h-5" />
                  Escolher da Galeria
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-gallery"
      />
      <input
        ref={cameraBackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-camera-back"
      />
      <input
        ref={cameraFrontInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
        data-testid="input-camera-front"
      />
    </div>
  );
};
