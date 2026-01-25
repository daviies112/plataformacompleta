import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RotateCcw, Check, Loader2, AlertCircle, CreditCard, FileText, RefreshCw, ArrowRight, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import { useDocumentValidation } from '@/hooks/useDocumentValidation';
import { useToast } from '@/hooks/use-toast';
import { DocumentGuideOverlay } from './DocumentGuideOverlay';
import type { DocumentType, DocumentDetectionResult } from '@/types/verification';

type CaptureSide = 'front' | 'back';

interface DocumentCaptureProps {
  onCapture: (images: string[], documentType: DocumentType) => void;
  onBack: () => void;
  primaryColor?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
}

const documentTypes: { type: DocumentType; label: string; icon: typeof CreditCard }[] = [
  { type: 'CNH', label: 'CNH', icon: CreditCard },
  { type: 'RG', label: 'RG', icon: FileText },
  { type: 'PASSPORT', label: 'Passaporte', icon: FileText },
];

const requiresTwoSides = (docType: DocumentType): boolean => docType === 'RG';

export const DocumentCapture = ({ onCapture, onBack, primaryColor = '#2c3e50', logoUrl = '', logoSize = 'medium' }: DocumentCaptureProps) => {
  const { 
    videoRef, 
    isReady, 
    isInitializing,
    error: cameraError, 
    startCamera, 
    stopCamera, 
    captureImage 
  } = useCamera({ facingMode: 'environment' });
  
  const { isValidating, error: validationError, validateDocument, clearError, reset: resetValidation } = useDocumentValidation();
  const { toast } = useToast();
  
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [detectionResult, setDetectionResult] = useState<DocumentDetectionResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const autoCaptureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasStartedCamera, setHasStartedCamera] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [captureSide, setCaptureSide] = useState<CaptureSide>('front');
  const [rgFrontImage, setRgFrontImage] = useState<string | null>(null);

  const getSideLabel = useCallback(() => {
    if (!selectedDocType || !requiresTwoSides(selectedDocType)) return '';
    return captureSide === 'front' ? 'Frente do RG' : 'Verso do RG';
  }, [selectedDocType, captureSide]);

  // Reset RG state when document type changes
  useEffect(() => {
    console.log('DocumentCapture: Document type changed to', selectedDocType);
    setCaptureSide('front');
    setRgFrontImage(null);
    setCapturedImage(null);
    setDetectionResult(null);
    setAutoCapture(false);
    clearError();
    resetValidation();
  }, [selectedDocType, clearError, resetValidation]);

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
      
      const sideLabel = getSideLabel();
      const baseMessage = sideLabel ? `${sideLabel}: ` : '';
      
      const result: DocumentDetectionResult = {
        detected,
        fullyVisible: detected && quality > 70,
        goodFocus: detected && quality > 75,
        noGlare: detected && quality > 68,
        quality,
        message: detected 
          ? quality >= 75 
            ? `${baseMessage}Perfeito! Capturando...`
            : quality >= 70 
              ? `${baseMessage}Ajuste levemente o ângulo`
              : `${baseMessage}Aproxime o documento`
          : `${baseMessage}Posicione o documento na moldura`,
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
  }, [isReady, capturedImage, selectedDocType, autoCapture, getSideLabel]);

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
    clearError();
    resetValidation();
    startCamera();
  }, [startCamera, clearError, resetValidation]);

  const handleConfirm = useCallback(async () => {
    if (!capturedImage || !selectedDocType || isValidating) return;

    const docTypeForApi = selectedDocType === 'PASSPORT' ? 'PASSAPORTE' : selectedDocType;
    const side = requiresTwoSides(selectedDocType) ? captureSide : undefined;

    const validationResult = await validateDocument(capturedImage, docTypeForApi as 'CNH' | 'RG' | 'PASSAPORTE', side);

    if (!validationResult.valid) {
      toast({
        variant: 'destructive',
        title: 'Documento inválido',
        description: validationResult.isSelfie 
          ? 'Esta foto parece ser uma selfie. Por favor, fotografe seu documento.'
          : validationResult.issues?.[0] || 'Documento não reconhecido. Certifique-se de que o documento está bem enquadrado.',
      });
      return;
    }

    if (requiresTwoSides(selectedDocType)) {
      if (captureSide === 'front') {
        setRgFrontImage(capturedImage);
        setCapturedImage(null);
        setCaptureSide('back');
        setDetectionResult(null);
        setAutoCapture(false);
        resetValidation();
        startCamera();
      } else {
        // Guard: verify rgFrontImage exists before confirming back side
        if (!rgFrontImage) {
          toast({
            variant: 'destructive',
            title: 'Erro na captura',
            description: 'A frente do RG não foi capturada. Por favor, comece novamente.',
          });
          // Reset to front side
          setCaptureSide('front');
          setCapturedImage(null);
          setDetectionResult(null);
          setAutoCapture(false);
          resetValidation();
          startCamera();
          return;
        }
        onCapture([rgFrontImage, capturedImage], selectedDocType);
      }
    } else {
      onCapture([capturedImage], selectedDocType);
    }
  }, [capturedImage, selectedDocType, captureSide, rgFrontImage, onCapture, startCamera, validateDocument, isValidating, toast, resetValidation]);

  const handleRetryCamera = useCallback(() => {
    console.log('DocumentCapture: Retrying camera...');
    stopCamera();
    setHasStartedCamera(false);
    setTimeout(() => {
      setHasStartedCamera(true);
      startCamera();
    }, 300);
  }, [startCamera, stopCamera]);

  const getConfirmButtonText = () => {
    if (!selectedDocType) return 'Confirmar';
    if (requiresTwoSides(selectedDocType) && captureSide === 'front') {
      return 'Próximo: Verso';
    }
    return 'Confirmar';
  };

  const getConfirmButtonIcon = () => {
    if (selectedDocType && requiresTwoSides(selectedDocType) && captureSide === 'front') {
      return <ArrowRight className="w-5 h-5 mr-2" />;
    }
    return <Check className="w-5 h-5 mr-2" />;
  };

  if (!selectedDocType) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-8"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
        >
          <FileText className="w-8 h-8 text-primary" />
        </motion.div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Selecione o Documento
        </h2>
        <p className="text-muted-foreground text-center mb-8">
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
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all duration-200"
                data-testid={`button-select-${doc.type.toLowerCase()}`}
              >
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="font-medium text-foreground">{doc.label}</span>
                {doc.type === 'RG' && (
                  <span className="text-xs text-muted-foreground">(frente e verso)</span>
                )}
              </motion.button>
            );
          })}
        </div>

        <Button 
          variant="ghost" 
          onClick={() => {
            // Reset RG state when going back
            setCaptureSide('front');
            setRgFrontImage(null);
            onBack();
          }} 
          className="mt-8" 
          data-testid="button-back"
        >
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
        <h2 className="text-xl font-semibold text-foreground mb-2">Erro na Câmera</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">{cameraError}</p>
        <div className="flex gap-3">
          <Button onClick={() => setSelectedDocType(null)} variant="outline" data-testid="button-back-error">
            Voltar
          </Button>
          <Button onClick={handleRetryCamera} data-testid="button-retry-camera">
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
      {logoUrl && selectedDocType && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center py-4"
        >
          <img 
            src={logoUrl} 
            alt="Logo" 
            style={{
              maxWidth: logoSize === 'small' ? '80px' : logoSize === 'large' ? '150px' : '120px',
              height: 'auto'
            }} 
          />
        </motion.div>
      )}
      
      <div className="absolute top-4 left-4 z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 backdrop-blur-sm border border-border"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {requiresTwoSides(selectedDocType) ? getSideLabel() : selectedDocType}
          </span>
        </motion.div>
      </div>

      {requiresTwoSides(selectedDocType) && (
        <div className="absolute top-4 right-4 z-10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 backdrop-blur-sm border border-border"
          >
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${captureSide === 'front' || rgFrontImage ? 'bg-accent' : 'bg-muted'}`} />
              <div className={`w-2 h-2 rounded-full ${captureSide === 'back' ? 'bg-accent' : 'bg-muted'}`} />
            </div>
            <span className="text-xs text-muted-foreground">
              {captureSide === 'front' ? '1/2' : '2/2'}
            </span>
          </motion.div>
        </div>
      )}

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
                  className="w-20 h-20 rounded-full bg-accent flex items-center justify-center shadow-lg"
                >
                  <Check className="w-10 h-10 text-accent-foreground" />
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
                style={{ display: isReady ? 'block' : 'none' }}
              />
              
              {showLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
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
                      data-testid="button-restart-camera"
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
                  sideLabel={getSideLabel()}
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
              className="flex flex-col gap-4"
            >
              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{validationError}</p>
                </motion.div>
              )}
              {isValidating && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
                >
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <p className="text-sm text-primary font-medium">Validando documento...</p>
                </motion.div>
              )}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRetake}
                  disabled={isValidating}
                  className="flex-1 h-14"
                  data-testid="button-retake"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Tirar Outra
                </Button>
                <Button
                  size="lg"
                  onClick={handleConfirm}
                  disabled={isValidating}
                  className="flex-1 h-14 bg-accent hover:bg-accent-light text-accent-foreground"
                  data-testid="button-confirm"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      {getConfirmButtonIcon()}
                      {getConfirmButtonText()}
                    </>
                  )}
                </Button>
              </div>
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
                    : requiresTwoSides(selectedDocType)
                      ? `Posicione ${captureSide === 'front' ? 'a FRENTE' : 'o VERSO'} do RG e aguarde a captura automática`
                      : 'Posicione o documento e aguarde a captura automática'}
              </p>
              <Button
                size="lg"
                onClick={handleCapture}
                disabled={!isReady}
                className="w-full h-14 bg-primary hover:bg-primary-light text-primary-foreground"
                data-testid="button-capture"
              >
                <Camera className="w-5 h-5 mr-2" />
                {isReady 
                  ? requiresTwoSides(selectedDocType)
                    ? `Capturar ${captureSide === 'front' ? 'Frente' : 'Verso'}`
                    : 'Capturar Documento'
                  : 'Aguardando...'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
