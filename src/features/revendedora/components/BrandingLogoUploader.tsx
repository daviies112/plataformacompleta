import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractColorsFromImage, type ColorPalette } from "@/features/revendedora/utils/colorExtractor";
import { toast } from "sonner";

interface BrandingLogoUploaderProps {
  currentLogo?: string;
  onLogoUpload: (file: File, logoUrl: string) => void;
  onColorsExtracted: (colors: ColorPalette) => void;
  onRemove?: () => void;
}

export function BrandingLogoUploader({
  currentLogo,
  onLogoUpload,
  onColorsExtracted,
  onRemove,
}: BrandingLogoUploaderProps) {
  const [preview, setPreview] = useState<string | undefined>(currentLogo);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPalette, setExtractedPalette] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza o preview com currentLogo quando ela mudar (ex: após carregar do Supabase)
  useEffect(() => {
    setPreview(currentLogo);
  }, [currentLogo]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione um arquivo de imagem válido");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setPreview(imageUrl);
      onLogoUpload(file, imageUrl);
    };
    reader.readAsDataURL(file);

    setIsExtracting(true);
    try {
      const colors = await extractColorsFromImage(file);
      setExtractedPalette(colors.palette);
      onColorsExtracted(colors);
      toast.success("Cores extraídas automaticamente da logo!", {
        description: `${colors.palette.length} cores encontradas`
      });
    } catch (error) {
      console.error("Error extracting colors:", error);
      toast.error("Erro ao extrair cores da imagem", {
        description: "Você pode selecionar as cores manualmente"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    setExtractedPalette(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {preview ? (
            <div className="relative group">
              <div className="w-32 h-32 rounded-lg border-2 border-border overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={preview}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClick}
                  disabled={isExtracting}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={isExtracting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleClick}
              disabled={isExtracting}
              className="w-32 h-32 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 bg-muted/50"
            >
              {isExtracting ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center px-2">
                    Clique para enviar logo
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex-1">
          <h4 className="font-medium mb-1">Logo da Empresa</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Envie a logo da sua empresa. As cores serão extraídas automaticamente.
          </p>
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PNG, JPG, SVG. Máximo 5MB.
          </p>
        </div>
      </div>

      {isExtracting && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Palette className="h-4 w-4 animate-pulse" />
          <span>Extraindo cores da logo...</span>
        </div>
      )}

      {extractedPalette && extractedPalette.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Palette className="h-4 w-4" />
            <span>Paleta de Cores Extraída</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {extractedPalette.map((color, index) => (
              <div
                key={index}
                className="group relative"
                title={color}
              >
                <div
                  className="w-10 h-10 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono bg-popover border border-border px-2 py-1 rounded whitespace-nowrap z-10">
                  {color}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
