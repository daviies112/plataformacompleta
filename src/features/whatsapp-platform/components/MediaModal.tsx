import { X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  fileName?: string;
}

export function MediaModal({ isOpen, onClose, mediaUrl, mediaType, caption, fileName }: MediaModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = fileName || (mediaType === 'image' ? 'imagem.jpg' : 'video.mp4');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex-1">
          {caption && (
            <p className="text-white text-sm line-clamp-2">{caption}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/20"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Media Content */}
      <div className="relative w-full h-full flex items-center justify-center p-4 pt-16 pb-16">
        {mediaType === "image" ? (
          <img
            src={mediaUrl}
            alt={caption || "Imagem"}
            className="max-w-full max-h-full object-contain cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(!isFullscreen);
            }}
            style={isFullscreen ? {
              width: '100vw',
              height: '100vh',
              objectFit: 'contain',
              maxWidth: 'none',
              maxHeight: 'none'
            } : undefined}
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
            style={{ maxHeight: '90vh', maxWidth: '90vw' }}
          >
            <source src={mediaUrl} type="video/mp4" />
            Seu navegador não suporta vídeo.
          </video>
        )}
      </div>

      {/* Footer */}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm text-center">{caption}</p>
        </div>
      )}

      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
