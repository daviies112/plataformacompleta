import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Check, RefreshCw, FileText, MapPin, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContract } from '@/contexts/ContractContext';
import { useToast } from '@/hooks/use-toast';

interface ResidenceProofStepProps {
  parabens_card_color?: string;
  parabens_background_color?: string;
  parabens_button_color?: string;
  parabens_text_color?: string;
  parabens_font_family?: string;
  button_text_color?: string;
  logo_url?: string;
  logo_size?: string;
  logo_position?: string;
}

export const ResidenceProofStep = (props: ResidenceProofStepProps = {}) => {
  const { setCurrentStep, addressData, setResidenceProofPhoto, setResidenceProofValidated } = useContract();
  const { toast } = useToast();
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardColor = props.parabens_card_color || '#1f293d';
  const backgroundColor = props.parabens_background_color || '#ffffff';
  const buttonColor = props.parabens_button_color || '#2c3e50';
  const textColor = props.parabens_text_color || '#ffffff';
  const fontFamily = props.parabens_font_family || 'Arial, sans-serif';
  const buttonTextColor = props.button_text_color || '#ffffff';

  const saveAndProceed = useCallback(async (imageData: string) => {
    if (isSaving || isSaved) return;
    
    setIsSaving(true);
    
    try {
      const contractId = window.location.pathname.match(/\/assinar\/([^/]+)/)?.[1];
      
      if (!contractId) {
        throw new Error('ID do contrato não encontrado');
      }

      console.log('[ResidenceProof] Salvando automaticamente para contrato:', contractId);
      
      const response = await fetch('/api/assinatura/public/save-residence-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          imageBase64: imageData,
          addressData: addressData || {},
          validated: true,
          manualReviewRequired: false
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erro ao salvar comprovante');
      }

      console.log('[ResidenceProof] Comprovante salvo com sucesso!', result);
      
      setResidenceProofPhoto(imageData);
      setResidenceProofValidated(true);
      setIsSaved(true);
      setIsSaving(false);
      
      toast({
        title: 'Comprovante salvo!',
        description: 'Foto do comprovante de residência registrada com sucesso.'
      });
      
    } catch (error) {
      console.error('[ResidenceProof] Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o comprovante. Tente novamente.',
        variant: 'destructive'
      });
      setIsSaving(false);
    }
  }, [addressData, setResidenceProofPhoto, setResidenceProofValidated, toast, isSaving, isSaved]);

  useEffect(() => {
    if (capturedImage && !isSaving && !isSaved) {
      saveAndProceed(capturedImage);
    }
  }, [capturedImage, saveAndProceed, isSaving, isSaved]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setIsCapturing(true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err);
            });
          }
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsCapturing(false);
      setCameraError('Não foi possível acessar a câmera. Use a opção de upload.');
      toast({
        title: 'Erro na câmera',
        description: 'Não foi possível acessar a câmera. Tente fazer upload de uma foto.',
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
    setIsSaved(false);
    setIsSaving(false);
    setCameraError(null);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione apenas arquivos de imagem.',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setCapturedImage(base64);
      setCameraError(null);
    };
    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo selecionado.',
        variant: 'destructive'
      });
    };
    reader.readAsDataURL(file);

    if (event.target) {
      event.target.value = '';
    }
  }, [toast]);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (isSaved) {
      console.log('[ResidenceProof] Comprovante salvo - avançando automaticamente para próxima etapa');
      const timer = setTimeout(() => {
        setCurrentStep(5);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSaved, setCurrentStep]);

  if (isSaving) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center px-4 py-6"
        style={{ fontFamily, backgroundColor }}
      >
        <div 
          className="w-full max-w-md rounded-lg p-8 text-center"
          style={{ backgroundColor: cardColor }}
        >
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: buttonColor }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: textColor }}>
            Salvando Comprovante...
          </h2>
          <p className="text-sm opacity-80" style={{ color: textColor }}>
            Aguarde enquanto processamos sua foto.
          </p>
        </div>
      </div>
    );
  }

  if (isSaved) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center px-4 py-6"
        style={{ fontFamily, backgroundColor }}
      >
        <div 
          className="w-full max-w-md rounded-lg p-8 text-center"
          style={{ backgroundColor: cardColor }}
        >
          <div 
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: buttonColor }}
          >
            <Check className="w-10 h-10" style={{ color: buttonTextColor }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: textColor }}>
            Comprovante Salvo!
          </h2>
          <p className="text-sm opacity-80 mb-4" style={{ color: textColor }}>
            Foto do comprovante de residência registrada com sucesso.
          </p>
          <p className="text-xs opacity-60" style={{ color: textColor }}>
            Avançando automaticamente...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col px-4 py-6"
      style={{ fontFamily, backgroundColor }}
    >
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {props.logo_url && (
          <div style={{ textAlign: (props.logo_position || 'center') as any, marginBottom: '24px' }}>
            <img 
              src={props.logo_url} 
              alt="Logo" 
              style={{
                maxWidth: props.logo_size === 'small' ? '100px' : props.logo_size === 'large' ? '300px' : '200px',
                height: 'auto',
                display: props.logo_position === 'center' ? 'inline-block' : undefined
              }} 
            />
          </div>
        )}
        <div className="text-center mb-6">
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-residence"
        />

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex-1 flex flex-col">
          {!isCapturing && !capturedImage && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div 
                className="w-full aspect-[4/3] rounded-lg flex items-center justify-center"
                style={{ backgroundColor: cardColor }}
              >
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: textColor }} />
                  <p className="text-sm opacity-70" style={{ color: textColor }}>
                    Capture ou faça upload do comprovante
                  </p>
                </div>
              </div>

              {cameraError && (
                <div className="text-center p-3 rounded-lg text-sm" style={{ backgroundColor: `${buttonColor}1A`, color: textColor }}>
                  {cameraError}
                </div>
              )}

              <div className="w-full space-y-3">
                <Button
                  onClick={startCamera}
                  className="w-full h-14 text-lg font-bold gap-2"
                  style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                  data-testid="button-start-camera"
                >
                  <Camera className="w-6 h-6" />
                  Tirar Foto
                </Button>

                <Button
                  onClick={triggerFileUpload}
                  variant="outline"
                  className="w-full h-12 gap-2"
                  data-testid="button-upload-file"
                >
                  <Upload className="w-5 h-5" />
                  Fazer Upload de Imagem
                </Button>
              </div>
            </div>
          )}

          {isCapturing && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1 h-12"
                  data-testid="button-cancel-camera"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="flex-1 h-12 font-bold gap-2"
                  style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                  data-testid="button-capture"
                >
                  <Camera className="w-5 h-5" />
                  Capturar
                </Button>
              </div>
            </div>
          )}

          {capturedImage && !isSaving && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Comprovante capturado"
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="mt-4">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="w-full h-12 gap-2"
                  data-testid="button-retake"
                >
                  <RefreshCw className="w-5 h-5" />
                  Tirar Outra Foto
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidenceProofStep;
