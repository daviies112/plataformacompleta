import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVerificationSession } from '@/hooks/assinatura/useVerificationSession';
import { useFaceDetection } from '@/hooks/assinatura/useFaceDetection';
import { useVerificationStorage } from '@/hooks/assinatura/useVerificationStorage';
import { ProgressIndicator } from './ProgressIndicator';
import { BrandingBackground } from './BrandingBackground';
import { WelcomeScreen } from './WelcomeScreen';
import { SelfieCapture } from './SelfieCapture';
import { DocumentCapture } from './DocumentCapture';
import { ProcessingScreen } from './ProcessingScreen';
import { ResultScreen } from './ResultScreen';
import type { DocumentType, VerificationResult } from '@/types/verification';
import { toast } from 'sonner';

interface StepLabels {
  selfie: string;
  document: string;
  analysis: string;
  result: string;
}

interface VerificationFlowProps {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  logoPosition?: 'center' | 'left' | 'right';
  footerText?: string;
  welcomeText?: string;
  instructionText?: string;
  securityText?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  iconUrl?: string;
  passLogoProps?: {
    logoUrl: string;
    logoSize: 'small' | 'medium' | 'large';
    logoPosition: 'center' | 'left' | 'right';
  };
  onComplete?: (result: any) => void;
  headerBackgroundColor?: string;
  headerLogoUrl?: string;
  headerCompanyName?: string;
  companyName?: string;
  startAtSelfie?: boolean;
  stepLabels?: StepLabels;
  inactiveCircleColor?: string;
  inactiveTextColor?: string;
  captureButtonText?: string;
  retakeButtonText?: string;
  confirmButtonText?: string;
  waitingInstructionText?: string;
  detectionDefaultMessage?: string;
  detectionCenterMessage?: string;
  detectionLightingMessage?: string;
  detectionQualityMessage?: string;
  detectionPerfectMessage?: string;
  iconColor?: string;
  buttonTextColor?: string;
  titleColor?: string;
}

export const VerificationFlow = ({ 
  primaryColor = '#2c3e50',
  secondaryColor = '#d9534f',
  fontFamily = 'Arial, sans-serif',
  fontSize = '16px',
  logoUrl = '',
  logoSize = 'medium',
  logoPosition = 'center',
  footerText = 'Verificação de Identidade Segura',
  welcomeText = '',
  instructionText = '',
  securityText = 'Suas informações são processadas de forma segura e criptografada',
  backgroundImage = '',
  backgroundColor = '#ffffff',
  iconUrl = '',
  passLogoProps,
  onComplete,
  textColor = '#000000',
  headerBackgroundColor = '#2c3e50',
  headerLogoUrl = '',
  headerCompanyName = '',
  companyName = '',
  startAtSelfie = false,
  stepLabels,
  inactiveCircleColor,
  inactiveTextColor,
  captureButtonText,
  retakeButtonText,
  confirmButtonText,
  waitingInstructionText,
  detectionDefaultMessage,
  detectionCenterMessage,
  detectionLightingMessage,
  detectionQualityMessage,
  detectionPerfectMessage,
  iconColor = '#2c3e50',
  buttonTextColor = '#ffffff',
  titleColor
}: VerificationFlowProps & { textColor?: string }) => {
  const {
    session,
    currentStep,
    startSession,
    saveSelfie,
    saveDocument,
    completeVerification,
    resetSession,
    goToStep,
  } = useVerificationSession();

  const { compareFacesAdvanced } = useFaceDetection();
  const { saveVerification } = useVerificationStorage();
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showBranding, setShowBranding] = useState(false);
  const hasCompletedCallbackRef = useRef(false);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = useCallback(() => {
    startSession();
    goToStep('selfie');
  }, [startSession, goToStep]);

  const handleBrandingContinue = useCallback(() => {
    setShowBranding(false);
    handleStart();
  }, [handleStart]);

  const handleSelfieCapture = useCallback((imageData: string) => {
    console.log('[VerificationFlow] Selfie captured, advancing to document step');
    setSelfieImage(imageData);
    saveSelfie(imageData);
    goToStep('document');
  }, [saveSelfie, goToStep]);

  const handleDocumentCapture = useCallback((imageData: string, documentType: DocumentType) => {
    console.log('[VerificationFlow] Document captured, advancing to processing step');
    setDocumentImage(imageData);
    saveDocument(imageData, documentType);
    goToStep('processing');
  }, [saveDocument, goToStep]);

  const handleProcessingComplete = useCallback(async (_result: VerificationResult | null, error?: string) => {
    if (error) {
      toast.error(error);
      goToStep('document');
      return;
    }

    if (!selfieImage || !documentImage) {
      toast.error('Imagens não disponíveis');
      goToStep('selfie');
      return;
    }

    try {
      console.log('Starting advanced face comparison...');
      const result = await compareFacesAdvanced(selfieImage, documentImage);
      
      const verificationResult: VerificationResult = {
        passed: result.passed,
        score: result.similarity,
        confidence: result.confidence,
        requiredScore: result.requiredScore,
        metrics: {
          euclidean: Math.round(result.metrics.euclideanScore),
          cosine: Math.round(result.metrics.cosineScore),
          landmarks: Math.round(result.metrics.landmarkScore),
          structural: Math.round(result.metrics.structuralScore),
          texture: Math.round(result.metrics.textureScore),
          histogram: Math.round(result.metrics.histogramScore),
          euclideanDistance: result.metrics.euclideanDistance,
          cosineDistance: result.metrics.cosineDistance,
          tripletScore: result.metrics.tripletScore,
          arcfaceScore: result.metrics.arcfaceScore,
          cosfaceScore: result.metrics.cosfaceScore,
          spherefaceScore: result.metrics.spherefaceScore,
          ensembleScore: result.metrics.ensembleScore,
        },
        selfieQuality: result.selfieQuality,
        documentQuality: result.documentQuality,
        ensembleAgreement: result.ensembleResult?.stats.agreementCount,
        adaptiveThreshold: result.ensembleResult?.stats.adaptiveThreshold,
      };

      const saved = await saveVerification(verificationResult);
      if (saved) {
        console.log('Verification saved to database:', saved.id);
      }

      setVerificationResult(verificationResult);
      completeVerification(result.similarity, result.passed, verificationResult);
      goToStep('result');
      
      if (onComplete && result.passed) {
        if (autoAdvanceTimeoutRef.current) {
          clearTimeout(autoAdvanceTimeoutRef.current);
        }
        autoAdvanceTimeoutRef.current = setTimeout(() => {
          if (!hasCompletedCallbackRef.current) {
            hasCompletedCallbackRef.current = true;
            onComplete({
              success: true,
              selfie: selfieImage,
              document: documentImage,
              result: verificationResult
            });
          }
        }, 2000);
      }

    } catch (err) {
      console.error('Face comparison failed:', err);
      toast.error(err instanceof Error ? err.message : 'Erro na comparação facial');
      goToStep('document');
    }
  }, [selfieImage, documentImage, compareFacesAdvanced, completeVerification, goToStep, saveVerification]);

  const handleRetry = useCallback(() => {
    hasCompletedCallbackRef.current = false;
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    
    setSelfieImage(null);
    setDocumentImage(null);
    setVerificationResult(null);
    resetSession();
    handleStart();
  }, [resetSession, handleStart]);

  useEffect(() => {
    if (startAtSelfie && currentStep === 'welcome') {
      handleStart();
    }
  }, [startAtSelfie, currentStep, handleStart]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const handleComplete = useCallback(() => {
    if (verificationResult && verificationResult.passed && onComplete && !hasCompletedCallbackRef.current) {
      hasCompletedCallbackRef.current = true;
      
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      
      const selfie = selfieImage;
      const document = documentImage;
      
      setSelfieImage(null);
      setDocumentImage(null);
      setVerificationResult(null);
      
      onComplete({
        success: true,
        selfie,
        document,
        result: verificationResult
      });
    } else if (verificationResult && verificationResult.passed && !onComplete) {
      toast.success('Verificação concluída com sucesso!');
      setSelfieImage(null);
      setDocumentImage(null);
      setVerificationResult(null);
      resetSession();
    } else if (!verificationResult?.passed) {
      setSelfieImage(null);
      setDocumentImage(null);
      setVerificationResult(null);
      resetSession();
    }
  }, [resetSession, verificationResult, selfieImage, documentImage, onComplete]);

  return (
    <>
      {showBranding && (logoUrl || backgroundImage) && (
        <BrandingBackground
          logoUrl={logoUrl}
          logoSize={logoSize}
          logoPosition={logoPosition}
          backgroundImage={backgroundImage}
          backgroundColor={backgroundColor}
          primaryColor={primaryColor}
          buttonTextColor={textColor}
          onContinue={handleBrandingContinue}
        />
      )}
      
      {!showBranding && (
        <div className="min-h-screen flex flex-col" style={{fontFamily, fontSize, color: textColor, backgroundColor}}>
          {logoUrl && (
            <div style={{
              position: 'fixed',
              top: '12px',
              left: '12px',
              zIndex: 50,
              pointerEvents: 'none'
            }} className="hidden md:block">
              <img src={logoUrl} alt="Logo" style={{
                height: logoSize === 'small' ? '36px' : logoSize === 'large' ? '56px' : '44px',
                width: 'auto',
                objectFit: 'contain'
              }} />
            </div>
          )}
          {logoUrl && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 0',
              pointerEvents: 'none'
            }} className="md:hidden">
              <img src={logoUrl} alt="Logo" style={{
                height: logoSize === 'small' ? '32px' : logoSize === 'large' ? '48px' : '40px',
                width: 'auto',
                objectFit: 'contain'
              }} />
            </div>
          )}
          {((headerLogoUrl && headerLogoUrl.trim() !== '') || (headerCompanyName && headerCompanyName.trim() !== '')) && (
            <div style={{
              backgroundColor: headerBackgroundColor,
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              position: 'sticky',
              top: 0,
              zIndex: 100
            }}>
              {headerLogoUrl && (
                <img src={headerLogoUrl} alt="Header Logo" style={{
                  height: '40px',
                  maxWidth: '100px'
                }} />
              )}
              {headerCompanyName && (
                <span style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  {headerCompanyName}
                </span>
              )}
            </div>
          )}
          <ProgressIndicator 
            currentStep={currentStep} 
            primaryColor={primaryColor}
            textColor={textColor}
            iconColor={iconColor}
            stepLabels={stepLabels}
            inactiveCircleColor={inactiveCircleColor}
            inactiveTextColor={inactiveTextColor}
          />
          
          <div className="flex-1 max-w-4xl mx-auto w-full">
            <AnimatePresence mode="wait">
          {currentStep === 'welcome' && (
            <WelcomeScreen 
              key="welcome" 
              onStart={handleStart}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              textColor={textColor}
              backgroundColor={backgroundColor}
              welcomeText={welcomeText}
              instructionText={instructionText}
              securityText={securityText}
              companyName={companyName}
              logoUrl={logoUrl}
              logoSize={logoSize}
              iconColor={iconColor}
              buttonTextColor={buttonTextColor}
            />
          )}
          
          {currentStep === 'selfie' && (
            <SelfieCapture
              key="selfie"
              onCapture={handleSelfieCapture}
              onBack={() => goToStep('welcome')}
              primaryColor={primaryColor}
              backgroundColor={backgroundColor}
              textColor={textColor}
              iconColor={iconColor}
              buttonColor={primaryColor}
              buttonTextColor={buttonTextColor}
              logoUrl={logoUrl}
              logoSize={logoSize}
              captureButtonText={captureButtonText}
              retakeButtonText={retakeButtonText}
              confirmButtonText={confirmButtonText}
              waitingInstructionText={waitingInstructionText}
              detectionDefaultMessage={detectionDefaultMessage}
              detectionCenterMessage={detectionCenterMessage}
              detectionLightingMessage={detectionLightingMessage}
              detectionQualityMessage={detectionQualityMessage}
              detectionPerfectMessage={detectionPerfectMessage}
            />
          )}
          
          {currentStep === 'document' && (
            <DocumentCapture
              key="document"
              onCapture={handleDocumentCapture}
              onBack={() => goToStep('selfie')}
              primaryColor={primaryColor}
              buttonColor={primaryColor}
              buttonTextColor={buttonTextColor}
              iconColor={iconColor}
              titleColor={titleColor}
              textColor={textColor}
              backgroundColor={backgroundColor}
              logoUrl={logoUrl}
              logoSize={logoSize}
            />
          )}
          
          {currentStep === 'processing' && selfieImage && documentImage && (
            <ProcessingScreen
              key="processing"
              selfieImage={selfieImage}
              documentImage={documentImage}
              onComplete={handleProcessingComplete}
              primaryColor={primaryColor}
              buttonColor={primaryColor}
              buttonTextColor={buttonTextColor}
              iconColor={iconColor}
              textColor={textColor}
              titleColor={titleColor}
              backgroundColor={backgroundColor}
              logoUrl={logoUrl}
              logoSize={logoSize}
            />
          )}
          
          {currentStep === 'result' && session && (
            <ResultScreen
              key="result"
              session={session}
              verificationResult={verificationResult}
              onRetry={handleRetry}
              onComplete={handleComplete}
              primaryColor={primaryColor}
              buttonColor={primaryColor}
              buttonTextColor={buttonTextColor}
              iconColor={iconColor}
              textColor={textColor}
              logoUrl={logoUrl}
              logoSize={logoSize}
            />
          )}
          {currentStep === 'result' && !session && (
            <motion.div
              key="result-fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-8"
              data-testid="verification-result-fallback"
            >
              {verificationResult?.passed ? (
                <>
                  <div 
                    className="w-28 h-28 rounded-full flex items-center justify-center mb-8" 
                    style={{ backgroundColor: `${primaryColor}1A` }}
                    data-testid="status-verification-passed"
                  >
                    <CheckCircle className="w-16 h-16" style={{ color: primaryColor }} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2" style={{ color: primaryColor }} data-testid="text-verification-title">
                    Verificação Aprovada!
                  </h1>
                  <p className="text-center max-w-md mb-8" style={{ color: textColor, opacity: 0.7 }} data-testid="text-verification-message">
                    Sua identidade foi verificada com sucesso.
                  </p>
                  <Button 
                    onClick={handleComplete} 
                    style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                    data-testid="button-continue-verification"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Continuar
                  </Button>
                </>
              ) : verificationResult && !verificationResult.passed ? (
                <>
                  <div className="w-28 h-28 rounded-full flex items-center justify-center mb-8 bg-destructive/10" data-testid="status-verification-failed">
                    <XCircle className="w-16 h-16 text-destructive" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2 text-destructive" data-testid="text-verification-failed-title">
                    Verificação Não Aprovada
                  </h1>
                  <p className="text-center max-w-md mb-8" style={{ color: textColor, opacity: 0.7 }} data-testid="text-verification-failed-message">
                    Não foi possível verificar sua identidade. Tente novamente com melhor iluminação.
                  </p>
                  <Button onClick={handleRetry} data-testid="button-retry-verification">
                    Tentar Novamente
                  </Button>
                </>
              ) : (
                <>
                  <div 
                    className="w-16 h-16 border-4 border-muted-foreground rounded-full animate-spin mb-8" 
                    style={{ borderTopColor: primaryColor }}
                    data-testid="status-verification-processing" 
                  />
                  <h1 className="text-xl font-semibold mb-2" style={{ color: textColor }} data-testid="text-processing-title">
                    Processando resultado...
                  </h1>
                  <p className="text-center max-w-md mb-6" style={{ color: textColor, opacity: 0.7 }} data-testid="text-processing-message">
                    Aguarde enquanto finalizamos a verificação.
                  </p>
                  <Button variant="outline" onClick={handleRetry} data-testid="button-retry-processing">
                    Tentar Novamente
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

          {footerText && (
            <div style={{
              marginTop: '20px',
              paddingTop: '15px',
              borderTop: `1px solid ${primaryColor}`,
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              padding: '20px'
            }}>
              {footerText}
            </div>
          )}
        </div>
      )}
    </>
  );
};
