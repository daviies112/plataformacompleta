import { motion } from 'framer-motion';
import type { FaceDetectionResult } from '@/types/verification';

interface FaceGuideOverlayProps {
  detectionResult: FaceDetectionResult | null;
  isCapturing: boolean;
}

export const FaceGuideOverlay = ({ detectionResult, isCapturing }: FaceGuideOverlayProps) => {
  const isReady = detectionResult?.detected && 
    detectionResult?.centered && 
    detectionResult?.goodLighting &&
    detectionResult?.quality >= 70;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Removed horizontal mask - only keep vertical oval guide */}

      {/* Face guide oval */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '10%' }}>
        <motion.div
          className={`
            relative w-56 h-72 sm:w-64 sm:h-80
            rounded-[50%] border-4 transition-colors duration-300
            ${isReady 
              ? 'border-accent shadow-[0_0_40px_rgba(20,184,166,0.4)]' 
              : detectionResult?.detected 
                ? 'border-warning' 
                : 'border-muted-foreground/50'
            }
          `}
          animate={isReady ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {/* Scanning animation */}
          {!isReady && detectionResult?.detected && (
            <motion.div
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent rounded-full"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Ready pulse */}
          {isReady && (
            <motion.div
              className="absolute -inset-2 rounded-[50%] border-2 border-accent"
              animate={{ scale: [1, 1.1], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
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
            {detectionResult?.message || 'Posicione seu rosto na área indicada'}
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
