import { motion } from 'framer-motion';
import type { DocumentDetectionResult } from '@/types/verification';

interface DocumentGuideOverlayProps {
  detectionResult: DocumentDetectionResult | null;
  isCapturing: boolean;
}

export const DocumentGuideOverlay = ({ detectionResult, isCapturing }: DocumentGuideOverlayProps) => {
  const isReady = detectionResult?.detected && 
    detectionResult?.fullyVisible && 
    detectionResult?.goodFocus &&
    detectionResult?.quality >= 70;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Darkened areas outside document frame */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <mask id="docMask">
            <rect width="100" height="100" fill="white" />
            <rect x="10" y="25" width="80" height="50" rx="2" fill="black" />
          </mask>
        </defs>
        <rect 
          width="100" 
          height="100" 
          fill="rgba(0, 0, 0, 0.6)" 
          mask="url(#docMask)" 
        />
      </svg>

      {/* Document guide frame */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <motion.div
          className={`
            relative w-full max-w-sm aspect-[1.6/1] rounded-lg
            border-4 transition-colors duration-300
            ${isReady 
              ? 'border-accent shadow-[0_0_40px_rgba(20,184,166,0.4)]' 
              : detectionResult?.detected 
                ? 'border-warning' 
                : 'border-muted-foreground/50'
            }
          `}
          animate={isReady ? { scale: [1, 1.01, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {/* Corner markers */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-current rounded-tl-md" />
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-current rounded-tr-md" />
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-current rounded-bl-md" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-current rounded-br-md" />

          {/* Scanning animation */}
          {!isReady && (
            <motion.div
              className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent"
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Ready indicator */}
          {isReady && (
            <motion.div
              className="absolute -inset-2 rounded-lg border-2 border-accent"
              animate={{ scale: [1, 1.05], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {/* Inner guide text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground/50 text-sm font-medium text-center px-4">
              Posicione o documento aqui
            </p>
          </div>
        </motion.div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-3 px-6">
        <motion.div
          key={detectionResult?.message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            px-6 py-3 rounded-full backdrop-blur-md
            ${isReady 
              ? 'bg-accent/90 text-accent-foreground' 
              : 'bg-card/90 text-foreground'
            }
          `}
        >
          <p className="text-sm font-medium text-center">
            {detectionResult?.message || 'Posicione o documento dentro da moldura'}
          </p>
        </motion.div>

        {/* Quality indicator */}
        {detectionResult?.detected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm"
          >
            <span className="text-xs text-muted-foreground">Qualidade:</span>
            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  detectionResult.quality >= 70 
                    ? 'bg-accent' 
                    : detectionResult.quality >= 40 
                      ? 'bg-warning' 
                      : 'bg-destructive'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${detectionResult.quality}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs font-medium text-foreground">
              {Math.round(detectionResult.quality)}%
            </span>
          </motion.div>
        )}
      </div>

      {/* Capturing overlay */}
      {isCapturing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-accent/20"
        />
      )}
    </div>
  );
};
