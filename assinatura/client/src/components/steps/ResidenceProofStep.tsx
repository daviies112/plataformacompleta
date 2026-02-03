import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Check, AlertTriangle, RefreshCw, X, FileText, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContract } from '@/contexts/ContractContext';
import { useToast } from '@/hooks/use-toast';

interface ResidenceProofStepProps {
  parabens_card_color?: string;
  parabens_background_color?: string;
  parabens_button_color?: string;
  parabens_text_color?: string;
  parabens_font_family?: string;
}

interface ValidationResult {
  success: boolean;
  match: boolean;
  extractedAddress: string;
  confidence: number;
  message: string;
}

export const ResidenceProofStep = (props: ResidenceProofStepProps = {}) => {
  const { setCurrentStep, addressData, setResidenceProofPhoto, setResidenceProofValidated } = useContract();
  const { toast } = useToast();
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showMismatchConfirm, setShowMismatchConfirm] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cardColor = props.parabens_card_color || '#dbeafe';
  const backgroundColor = props.parabens_background_color || '#f0fdf4';
  const buttonColor = props.parabens_button_color || '#22c55e';
  const textColor = props.parabens_text_color || '#1e40af';
  const fontFamily = props.parabens_font_family || 'Arial, sans-serif';

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsCapturing(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões.');
      toast({
        title: 'Erro na câmera',
        description: 'Não foi possível acessar a câmera. Verifique as permissões do navegador.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setValidationResult(null);
    setShowMismatchConfirm(false);
    startCamera();
  }, [startCamera]);

  const validateResidenceProof = async () => {
    if (!capturedImage || !addressData) {
      toast({
        title: 'Dados incompletos',
        description: 'Capture uma foto e verifique se o endereço foi preenchido.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/assinatura/public/validate-residence-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImage,
          addressData: {
            street: addressData.street,
            number: addressData.number,
            city: addressData.city,
            state: addressData.state,
            zipcode: addressData.zipcode
          }
        })
      });

      const result: ValidationResult = await response.json();
      setValidationResult(result);

      if (result.match) {
        setResidenceProofPhoto(capturedImage);
        setResidenceProofValidated(true);
        toast({
          title: 'Comprovante validado!',
          description: 'O endereço do documento confere com o cadastrado.'
        });
      } else {
        setShowMismatchConfirm(true);
      }
    } catch (error) {
      console.error('Error validating residence proof:', error);
      toast({
        title: 'Erro na validação',
        description: 'Não foi possível validar o comprovante. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedWithMismatch = () => {
    setResidenceProofPhoto(capturedImage);
    setResidenceProofValidated(false);
    toast({
      title: 'Continuando sem validação',
      description: 'O comprovante será revisado manualmente.'
    });
    setCurrentStep(5);
  };

  const proceedToNextStep = () => {
    setCurrentStep(5);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div 
      className="flex flex-col px-4 py-6 pb-24"
      style={{ fontFamily, backgroundColor, minHeight: '100dvh', paddingBottom: 'max(6rem, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: cardColor }}
          >
            <FileText className="w-8 h-8" style={{ color: buttonColor }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
            Comprovante de Residência
          </h1>
          <p className="text-sm opacity-80" style={{ color: textColor }}>
            Tire uma foto de um comprovante recente (conta de luz, água, gás, etc.)
          </p>
        </div>

        {addressData && (
          <div 
            className="rounded-lg p-4 mb-4"
            style={{ backgroundColor: cardColor }}
          >
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: buttonColor }} />
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: textColor }}>
                  Endereço cadastrado:
                </p>
                <p className="text-sm opacity-80" style={{ color: textColor }}>
                  {addressData.street}, {addressData.number}
                  {addressData.complement && ` - ${addressData.complement}`}
                </p>
                <p className="text-sm opacity-80" style={{ color: textColor }}>
                  {addressData.city} - {addressData.state}, {addressData.zipcode}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {!isCapturing && !capturedImage && (
            <div 
              className="flex-1 rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-8"
              style={{ borderColor: buttonColor, backgroundColor: `${cardColor}50` }}
            >
              {cameraError ? (
                <>
                  <AlertTriangle className="w-12 h-12 mb-4 text-amber-500" />
                  <p className="text-center text-sm mb-4" style={{ color: textColor }}>
                    {cameraError}
                  </p>
                  <Button
                    onClick={startCamera}
                    className="text-white font-bold"
                    style={{ backgroundColor: buttonColor }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                  </Button>
                </>
              ) : (
                <>
                  <Camera className="w-16 h-16 mb-4" style={{ color: buttonColor }} />
                  <p className="text-center text-sm mb-4" style={{ color: textColor }}>
                    Posicione o documento de forma que o endereço fique legível
                  </p>
                  <Button
                    onClick={startCamera}
                    className="text-white font-bold text-lg h-14 px-8"
                    style={{ backgroundColor: buttonColor }}
                    data-testid="button-start-camera"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Abrir Câmera
                  </Button>
                </>
              )}
            </div>
          )}

          {isCapturing && (
            <div className="flex-1 flex flex-col">
              <div className="relative flex-1 bg-black rounded-lg overflow-hidden min-h-[300px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-4 border-2 border-white/50 rounded-lg pointer-events-none" />
              </div>
              
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1 h-12"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="flex-1 h-12 text-white font-bold"
                  style={{ backgroundColor: buttonColor }}
                  data-testid="button-capture"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capturar
                </Button>
              </div>
            </div>
          )}

          {capturedImage && !validationResult && (
            <div className="flex-1 flex flex-col">
              <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden min-h-[300px]">
                <img
                  src={capturedImage}
                  alt="Comprovante capturado"
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="flex-1 h-12"
                  disabled={isProcessing}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nova Foto
                </Button>
                <Button
                  onClick={validateResidenceProof}
                  className="flex-1 h-12 text-white font-bold"
                  style={{ backgroundColor: buttonColor }}
                  disabled={isProcessing}
                  data-testid="button-validate"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Validar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {validationResult && validationResult.match && (
            <div 
              className="flex-1 rounded-lg p-6 flex flex-col items-center justify-center"
              style={{ backgroundColor: '#dcfce7' }}
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-green-800 mb-2">Endereço Confirmado!</h2>
              <p className="text-center text-green-700 text-sm mb-2">
                {validationResult.message}
              </p>
              <p className="text-center text-green-600 text-xs mb-4">
                Confiança: {Math.round(validationResult.confidence * 100)}%
              </p>
              {validationResult.extractedAddress && (
                <div className="bg-white/50 rounded p-3 w-full mb-4">
                  <p className="text-xs text-green-700 font-medium mb-1">Endereço extraído:</p>
                  <p className="text-sm text-green-800">{validationResult.extractedAddress}</p>
                </div>
              )}
              <Button
                onClick={proceedToNextStep}
                className="w-full h-12 text-white font-bold"
                style={{ backgroundColor: buttonColor }}
                data-testid="button-proceed"
              >
                Continuar
              </Button>
            </div>
          )}

          {showMismatchConfirm && validationResult && !validationResult.match && (
            <div 
              className="flex-1 rounded-lg p-6 flex flex-col"
              style={{ backgroundColor: '#fef3c7' }}
            >
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-amber-800 mb-2">Endereço Diferente</h2>
                <p className="text-center text-amber-700 text-sm mb-4">
                  {validationResult.message}
                </p>
                {validationResult.extractedAddress && (
                  <div className="bg-white/50 rounded p-3 w-full mb-4">
                    <p className="text-xs text-amber-700 font-medium mb-1">Endereço extraído:</p>
                    <p className="text-sm text-amber-800">{validationResult.extractedAddress}</p>
                  </div>
                )}
                <p className="text-center text-amber-600 text-xs mb-4">
                  Confiança: {Math.round(validationResult.confidence * 100)}%
                </p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="w-full h-12 border-amber-400"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tirar Outra Foto
                </Button>
                <Button
                  onClick={proceedWithMismatch}
                  className="w-full h-12 bg-amber-600 text-white font-bold hover:bg-amber-700"
                  data-testid="button-proceed-mismatch"
                >
                  Continuar Mesmo Assim
                </Button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
