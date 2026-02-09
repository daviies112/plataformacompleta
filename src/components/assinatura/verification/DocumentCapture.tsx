import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RotateCcw, Check, Loader2, AlertCircle, CreditCard, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/assinatura/useCamera';
import { DocumentGuideOverlay } from './DocumentGuideOverlay';
import type { DocumentType, DocumentDetectionResult } from '@/types/verification';

interface DocumentCaptureProps {
  onCapture: (imageData: string, documentType: DocumentType) => void;
  onBack: () => void;
  primaryColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  iconColor?: string;
  titleColor?: string;
  textColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
}

const documentTypes: { type: DocumentType; label: string; icon: typeof CreditCard }[] = [
  { type: 'CNH', label: 'CNH', icon: CreditCard },
  { type: 'RG', label: 'RG', icon: FileText },
  { type: 'RNE', label: 'RNE', icon: FileText },
  { type: 'PASSPORT', label: 'Passaporte', icon: FileText },
];

export const DocumentCapture = ({ 
  onCapture, 
  onBack, 
  primaryColor = '#2c3e50', 
  buttonColor,
  buttonTextColor = '#ffffff',
  iconColor,
  titleColor,
  textColor,
  backgroundColor,
  logoUrl = '', 
  logoSize = 'medium' 
}: DocumentCaptureProps) => {
  const effectiveButtonColor = buttonColor || primaryColor;
  const effectiveIconColor = iconColor || primaryColor;
  const effectiveTextColor = textColor || undefined;
  const effectiveTitleColor = titleColor || undefined;

  const { 
    videoRef, 
    isReady, 
    isInitializing,
    error: cameraError, 
    startCamera, 
    stopCamera, 
    switchCamera,
    facingMode,
    captureImage 
  } = useCamera({ facingMode: 'environment' });
  
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [detectionResult, setDetectionResult] = useState<DocumentDetectionResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const autoCaptureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasStartedCamera, setHasStartedCamera] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedDocType && !hasStartedCamera) {
      console.log('DocumentCapture: Starting camera for', selectedDocType);
      setHasStartedCamera(true);
      startCamera();
    }
  }, [selectedDocType, hasStartedCamera, startCamera]);

  useEffect(() => {
    return () => {
      console.log('DocumentCapture: Cleaning up...');
      stopCamera();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!isReady || capturedImage || !selectedDocType) return;

    console.log('DocumentCapture: Starting detection interval');
    
    detectionIntervalRef.current = setInterval(() => {
      const quality = 60 + Math.random() * 40;
      const detected = quality > 65;
      
      const result: DocumentDetectionResult = {
        detected,
        fullyVisible: detected && quality > 70,
        goodFocus: detected && quality > 75,
        noGlare: detected && quality > 68,
        quality,
        message: detected 
          ? quality >= 75 
            ? 'Perfeito! Capturando...' 
            : quality >= 70 
              ? 'Ajuste levemente o ângulo' 
              : 'Aproxime o documento'
          : 'Posicione o documento na moldura',
      };
      
      setDetectionResult(result);
      
      const isIdeal = result.detected && 
        result.fullyVisible && 
        result.goodFocus && 
        result.quality >= 75;
      
      if (isIdeal && !autoCapture) {
        console.log('DocumentCapture: Conditions ideal, starting auto-capture...');
        setAutoCapture(true);
        autoCaptureTimeoutRef.current = setTimeout(() => {
          handleCapture();
        }, 1500);
      } else if (!isIdeal && autoCapture) {
        console.log('DocumentCapture: Conditions no longer ideal, canceling auto-capture');
        setAutoCapture(false);
        if (autoCaptureTimeoutRef.current) {
          clearTimeout(autoCaptureTimeoutRef.current);
        }
      }
    }, 500);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isReady, capturedImage, selectedDocType, autoCapture]);

  const handleCapture = useCallback(() => {
    setIsCapturing(true);
    setTimeout(() => {
      const image = captureImage();
      if (image) {
        setCapturedImage(image);
        stopCamera();
      } else {
        console.log('DocumentCapture: Failed to capture image');
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
    if (capturedImage && selectedDocType) {
      onCapture(capturedImage, selectedDocType);
    }
  }, [capturedImage, selectedDocType, onCapture]);

  const handleRetryCamera = useCallback(() => {
    console.log('DocumentCapture: Retrying camera...');
    stopCamera();
    setHasStartedCamera(false);
    setTimeout(() => {
      setHasStartedCamera(true);
      startCamera();
    }, 300);
  }, [startCamera, stopCamera]);

  if (!selectedDocType) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-8"
      >
        <h2 className="text-xl font-semibold mb-2" style={{ color: effectiveTitleColor }}>
          Selecione o Documento
        </h2>
        <p className="text-center mb-8" style={{ color: effectiveTextColor, opacity: 0.7 }}>
          Escolha o tipo de documento que você vai fotografar
        </p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {documentTypes.map((doc, index) => {
            const Icon = doc.icon;
            return (
              <motion.button
                key={doc.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedDocType(doc.type)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-200"
                style={{ 
                  backgroundColor: effectiveButtonColor,
                  border: `1px solid ${effectiveButtonColor}`
                }}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${backgroundColor || '#954728'}33` }}>
                  <Icon className="w-6 h-6" style={{ color: backgroundColor || '#954728' }} />
                </div>
                <span className="font-medium" style={{ color: '#ffffff' }}>{doc.label}</span>
              </motion.button>
            );
          })}
        </div>

        <Button variant="ghost" onClick={onBack} className="mt-8">
          Voltar
        </Button>
      </motion.div>
    );
  }

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
        <h2 className="text-xl font-semibold mb-2" style={{ color: effectiveTitleColor }}>Erro na Câmera</h2>
        <p className="text-center mb-6 max-w-sm" style={{ color: effectiveTextColor, opacity: 0.7 }}>{cameraError}</p>
        <div className="flex gap-3">
          <Button onClick={() => setSelectedDocType(null)} variant="outline">
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
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 backdrop-blur-sm border border-border"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{selectedDocType}</span>
        </motion.div>
      </div>

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
                alt="Captured document"
                className="w-full h-full object-cover"
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
                  display: isReady ? 'block' : 'none',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
              />
              
              {showLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: effectiveButtonColor }} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {isInitializing ? 'Acessando câmera traseira...' : 'Iniciando câmera...'}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {isInitializing 
                          ? 'Permita o acesso à câmera quando solicitado'
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
              
              {isReady && (
                <DocumentGuideOverlay 
                  detectionResult={detectionResult} 
                  isCapturing={isCapturing}
                  buttonColor={effectiveButtonColor}
                  textColor={effectiveTextColor}
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
                Tirar Outra
              </Button>
              <Button
                size="lg"
                onClick={handleConfirm}
                className="flex-1 h-14"
                style={{ backgroundColor: effectiveButtonColor, color: buttonTextColor }}
              >
                <Check className="w-5 h-5 mr-2" />
                Confirmar
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
                    : 'Posicione o documento e aguarde a captura automática'}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  onClick={handleCapture}
                  disabled={!isReady}
                  className="flex-1 h-14"
                  style={{ backgroundColor: effectiveButtonColor, color: buttonTextColor }}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isReady ? 'Capturar Documento' : 'Aguardando...'}
                </Button>

                {isReady && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={switchCamera}
                    className="h-14 w-14 flex-shrink-0"
                    style={{ borderColor: `${effectiveButtonColor}33` }}
                    title="Virar Câmera"
                  >
                    <RefreshCw className="w-6 h-6" style={{ color: effectiveIconColor }} />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
