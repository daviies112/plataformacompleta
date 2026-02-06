import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RotateCcw, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/assinatura/useCamera';
import { useFaceDetection } from '@/hooks/assinatura/useFaceDetection';
import { FaceGuideOverlay } from './FaceGuideOverlay';
import type { FaceDetectionResult } from '@/types/verification';

interface SelfieCaptureProps {
  onCapture: (imageData: string) => void;
  onBack: () => void;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  captureButtonText?: string;
  retakeButtonText?: string;
  confirmButtonText?: string;
  waitingInstructionText?: string;
  detectionDefaultMessage?: string;
  detectionCenterMessage?: string;
  detectionLightingMessage?: string;
  detectionQualityMessage?: string;
  detectionPerfectMessage?: string;
}

export const SelfieCapture = ({ 
  onCapture, 
  onBack, 
  primaryColor = '#2c3e50', 
  backgroundColor,
  textColor,
  iconColor,
  buttonColor,
  buttonTextColor = '#ffffff',
  logoUrl = '', 
  logoSize = 'medium',
  captureButtonText = 'Capturar Agora',
  retakeButtonText = 'Tirar Outra',
  confirmButtonText = 'Confirmar',
  waitingInstructionText = 'Posicione seu rosto e aguarde a captura automática',
  detectionDefaultMessage = 'Posicione seu rosto na área indicada',
  detectionCenterMessage = 'Centralize seu rosto',
  detectionLightingMessage = 'Melhore a iluminação',
  detectionQualityMessage = 'Aproxime seu rosto',
  detectionPerfectMessage = 'Perfeito! Capturando...'
}: SelfieCaptureProps) => {
  const effectiveButtonColor = buttonColor || primaryColor;

  const { 
    videoRef, 
    isReady, 
    isInitializing, 
    error: cameraError, 
    startCamera, 
    stopCamera, 
    captureImage 
  } = useCamera({ facingMode: 'user' });
  
  const { isModelLoaded, isLoading: modelLoading, detectFace } = useFaceDetection();
  const [detectionResult, setDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCaptureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasStarted) {
      console.log('SelfieCapture mounted, starting camera immediately...');
      setHasStarted(true);
      startCamera();
    }
  }, [hasStarted, startCamera]);

  useEffect(() => {
    return () => {
      console.log('SelfieCapture unmounting, cleaning up...');
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady || !isModelLoaded || capturedImage) {
      return;
    }

    console.log('Starting face detection interval');
    
    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const result = await detectFace(video);
          
          let message = detectionDefaultMessage;
          if (result.detected) {
            if (!result.centered) message = detectionCenterMessage;
            else if (!result.goodLighting) message = detectionLightingMessage;
            else if (result.quality < 75) message = detectionQualityMessage;
            else message = detectionPerfectMessage;
          }
          
          const updatedResult = { ...result, message };
          setDetectionResult(updatedResult);
          
          const isIdeal = result.detected && 
            result.centered && 
            result.goodLighting && 
            result.quality >= 75;
          
          if (isIdeal && !autoCapture) {
            console.log('SelfieCapture: Conditions ideal, starting auto-capture...');
            setAutoCapture(true);
            autoCaptureTimeoutRef.current = setTimeout(() => {
              handleCapture();
            }, 1500);
          } else if (!isIdeal && autoCapture) {
            console.log('SelfieCapture: Conditions no longer ideal, canceling auto-capture');
            setAutoCapture(false);
            if (autoCaptureTimeoutRef.current) {
              clearTimeout(autoCaptureTimeoutRef.current);
            }
          }
        } catch (err) {
          console.error('Face detection error:', err);
        }
      }
    }, 250);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isReady, isModelLoaded, capturedImage, autoCapture, videoRef, detectFace]);

  const handleCapture = useCallback(() => {
    setIsCapturing(true);
    setTimeout(() => {
      const image = captureImage();
      if (image) {
        setCapturedImage(image);
        stopCamera();
      } else {
        console.log('Failed to capture image');
      }
      setIsCapturing(false);
    }, 100);
  }, [captureImage, stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setDetectionResult(null);
    setAutoCapture(false);
    startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const handleRetryCamera = useCallback(() => {
    console.log('Retrying camera...');
    stopCamera();
    setHasStarted(false);
    setTimeout(() => {
      setHasStarted(true);
      startCamera();
    }, 300);
  }, [startCamera, stopCamera]);

  if (cameraError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-8"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Erro na Câmera</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">{cameraError}</p>
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline">
            Voltar
          </Button>
          <Button onClick={handleRetryCamera}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </motion.div>
    );
  }

  const showLoading = isInitializing || (!isReady && !capturedImage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full min-h-[80vh]"
    >
      <div className="flex-1 relative bg-foreground/5 overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {capturedImage ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0"
            >
              <img
                src={capturedImage}
                alt="Captured selfie"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: effectiveButtonColor }}
                >
                  <Check className="w-10 h-10" style={{ color: buttonTextColor }} />
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ 
                  transform: 'scaleX(-1)',
                  display: isReady ? 'block' : 'none'
                }}
              />
              
              {showLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: effectiveButtonColor }} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {isInitializing ? 'Acessando câmera...' : 'Iniciando câmera...'}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {isInitializing 
                          ? 'Aguarde a permissão ser processada'
                          : 'Preparando visualização'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRetryCamera}
                      className="mt-2"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reiniciar Câmera
                    </Button>
                  </div>
                </div>
              )}

              {isReady && modelLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: effectiveButtonColor }} />
                    <p className="text-sm text-muted-foreground">
                      Carregando detecção facial...
                    </p>
                  </div>
                </div>
              )}
              
              {isReady && isModelLoaded && (
                <FaceGuideOverlay 
                  detectionResult={detectionResult} 
                  isCapturing={isCapturing}
                  buttonColor={effectiveButtonColor}
                  textColor={textColor}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-card border-t border-border">
        <AnimatePresence mode="wait">
          {capturedImage ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-4"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={handleRetake}
                className="flex-1 h-14"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                {retakeButtonText}
              </Button>
              <Button
                size="lg"
                onClick={handleConfirm}
                className="flex-1 h-14"
                style={{ backgroundColor: effectiveButtonColor, color: buttonTextColor }}
              >
                <Check className="w-5 h-5 mr-2" />
                {confirmButtonText}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <p className="text-center text-sm text-muted-foreground mb-4">
                {!isReady 
                  ? 'Aguardando câmera...'
                  : autoCapture 
                    ? 'Capturando automaticamente...' 
                    : waitingInstructionText}
              </p>
              <Button
                size="lg"
                onClick={handleCapture}
                disabled={!isReady}
                className="w-full h-14"
                style={{ backgroundColor: effectiveButtonColor, color: buttonTextColor }}
              >
                <Camera className="w-5 h-5 mr-2" />
                {isReady ? captureButtonText : 'Aguardando...'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
