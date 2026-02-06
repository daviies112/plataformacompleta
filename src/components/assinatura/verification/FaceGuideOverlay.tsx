import { motion } from 'framer-motion';
import type { FaceDetectionResult } from '@/types/verification';

interface FaceGuideOverlayProps {
  detectionResult: FaceDetectionResult | null;
  isCapturing: boolean;
  buttonColor?: string;
  textColor?: string;
}

export const FaceGuideOverlay = ({ detectionResult, isCapturing, buttonColor = '#2c3e50', textColor }: FaceGuideOverlayProps) => {
  const isReady = detectionResult?.detected && 
    detectionResult?.centered && 
    detectionResult?.goodLighting &&
    detectionResult?.quality >= 75;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '10%' }}>
        <motion.div
          className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-[50%] border-4 transition-colors duration-300"
          style={{
            borderColor: isReady ? buttonColor : detectionResult?.detected ? `${buttonColor}80` : '#9ca3af80',
            boxShadow: isReady ? `0 0 40px ${buttonColor}40` : 'none'
          }}
          animate={isReady ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {isReady && (
            <motion.div
              className="absolute -inset-2 rounded-[50%] border-2"
              style={{ borderColor: buttonColor }}
              animate={{ scale: [1, 1.1], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {!isReady && (
            <motion.div
              className="absolute inset-x-0 h-1 rounded-full"
              style={{ background: `linear-gradient(to right, transparent, ${buttonColor}, transparent)` }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </motion.div>
      </div>

      <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-3 px-6">
        <motion.div
          key={detectionResult?.message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-3 rounded-full backdrop-blur-md"
          style={isReady ? { backgroundColor: `${buttonColor}E6`, color: 'white' } : { backgroundColor: 'rgba(255,255,255,0.9)', color: textColor || '#333' }}
        >
          <p className="text-sm font-medium text-center">
            {detectionResult?.message || 'Posicione seu rosto na área indicada'}
          </p>
        </motion.div>

        {detectionResult?.detected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
          >
            <span className="text-xs" style={{ color: textColor || '#666' }}>Qualidade:</span>
            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: detectionResult.quality >= 70 ? buttonColor : detectionResult.quality >= 40 ? `${buttonColor}99` : '#ef4444'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${detectionResult.quality}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: textColor || '#333' }}>
              {Math.round(detectionResult.quality)}%
            </span>
          </motion.div>
        )}
      </div>

      {isCapturing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
          style={{ backgroundColor: `${buttonColor}33` }}
        />
      )}
    </div>
  );
};
