import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImageUpload } from '@/hooks';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  bucket: 'product-images' | 'company-logos' | 'reseller-stores';
  folder?: string;
  currentImage?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  maxSizeMB?: number;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  className?: string;
}

export function ImageUploader({
  bucket,
  folder,
  currentImage,
  onImageUploaded,
  onImageRemoved,
  maxSizeMB = 5,
  aspectRatio = 'square',
  className,
}: ImageUploaderProps) {
  const { uploadImage, deleteImage, uploading, progress } = useImageUpload();
  const [dragActive, setDragActive] = useState(false);

  const aspectRatioClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  const handleFileChange = async (file: File) => {
    const url = await uploadImage(file, {
      bucket,
      folder,
      maxSizeMB,
    });

    if (url) {
      onImageUploaded(url);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = async () => {
    if (currentImage) {
      const success = await deleteImage(currentImage, bucket);
      if (success && onImageRemoved) {
        onImageRemoved();
      }
    }
  };

  return (
    <div className={cn('relative', aspectRatioClasses[aspectRatio], className)}>
      {currentImage && !uploading ? (
        <div className="relative w-full h-full group">
          <img
            src={currentImage}
            alt="Uploaded"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <label htmlFor="image-upload-replace">
              <Button variant="secondary" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Substituir
                </span>
              </Button>
            </label>
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>
          <input
            id="image-upload-replace"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            disabled={uploading}
          />
        </div>
      ) : (
        <div
          className={cn(
            'w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enviando... {progress}%</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <label htmlFor="image-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">Escolher arquivo</span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  ou arraste e solte aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WEBP ou SVG (máx. {maxSizeMB}MB)
                </p>
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                disabled={uploading}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
