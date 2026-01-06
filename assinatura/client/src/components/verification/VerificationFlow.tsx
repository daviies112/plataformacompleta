import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useVerificationSession } from '@/hooks/useVerificationSession';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useVerificationStorage } from '@/hooks/useVerificationStorage';
import { ProgressIndicator } from './ProgressIndicator';
import { BrandingBackground } from './BrandingBackground';
import { WelcomeScreen } from './WelcomeScreen';
import { SelfieCapture } from './SelfieCapture';
import { DocumentCapture } from './DocumentCapture';
import { ProcessingScreen } from './ProcessingScreen';
import { ResultScreen } from './ResultScreen';
import type { DocumentType, VerificationResult } from '@/types/verification';
import { toast } from 'sonner';

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
  headerCompanyName = ''
}: VerificationFlowProps & { textColor?: string } = {}) => {
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
  const [showBranding, setShowBranding] = useState(!!(logoUrl || backgroundImage));

  const handleStart = useCallback(() => {
    startSession();
    goToStep('selfie');
  }, [startSession, goToStep]);

  const handleBrandingContinue = useCallback(() => {
    setShowBranding(false);
    handleStart();
  }, [handleStart]);

  const handleSelfieCapture = useCallback((imageData: string) => {
    setSelfieImage(imageData);
    saveSelfie(imageData);
    sessionStorage.setItem('verification_selfie', imageData);
    goToStep('document');
  }, [saveSelfie, goToStep]);

  const handleDocumentCapture = useCallback((imageData: string, documentType: DocumentType) => {
    setDocumentImage(imageData);
    saveDocument(imageData, documentType);
    sessionStorage.setItem('verification_document', imageData);
    goToStep('processing');
  }, [saveDocument, goToStep]);

  const handleProcessingComplete = useCallback(async (_result: VerificationResult | null, error?: string) => {
    if (error) {
      toast.error(error);
      goToStep('document');
      return;
    }

    // Run actual comparison when processing animation completes
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
          // Advanced algorithm scores
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

      // Save to database
      const saved = await saveVerification(verificationResult);
      if (saved) {
        console.log('Verification saved to database:', saved.id);
      }

      setVerificationResult(verificationResult);
      completeVerification(result.similarity, result.passed, verificationResult);
      goToStep('result');
      
      // Call onComplete callback to notify parent component
      if (onComplete && result.passed) {
        setTimeout(() => {
          onComplete(verificationResult);
        }, 2000);
      }

    } catch (err) {
      console.error('Face comparison failed:', err);
      toast.error(err instanceof Error ? err.message : 'Erro na comparação facial');
      goToStep('document');
    }
  }, [selfieImage, documentImage, compareFacesAdvanced, completeVerification, goToStep, saveVerification]);

  const handleRetry = useCallback(() => {
    setSelfieImage(null);
    setDocumentImage(null);
    setVerificationResult(null);
    resetSession();
    handleStart();
  }, [resetSession, handleStart]);

  const handleComplete = useCallback(() => {
    setSelfieImage(null);
    setDocumentImage(null);
    setVerificationResult(null);
    resetSession();
  }, [resetSession]);

  return (
    <>
      {showBranding && (logoUrl || backgroundImage) && (
        <BrandingBackground
          logoUrl={logoUrl}
          logoSize={logoSize}
          logoPosition={logoPosition}
          backgroundImage={backgroundImage}
          onContinue={handleBrandingContinue}
        />
      )}
      
      {!showBranding && (
        <div className="min-h-screen flex flex-col" style={{fontFamily, fontSize, color: textColor, backgroundColor}}>
          {/* Header fixo */}
          {(headerLogoUrl || headerCompanyName) && (
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
          <ProgressIndicator currentStep={currentStep} primaryColor={primaryColor} />
          
          {logoUrl && (
            <div style={{
              textAlign: logoPosition as any,
              padding: '20px',
              marginBottom: '20px'
            }}>
              <img src={logoUrl} alt="Logo" style={{
                maxWidth: logoSize === 'small' ? '100px' : logoSize === 'large' ? '300px' : '200px',
                height: 'auto'
              }} />
            </div>
          )}
          
          <div className="flex-1">
            <AnimatePresence mode="wait">
          {currentStep === 'welcome' && (
            <WelcomeScreen 
              key="welcome" 
              onStart={handleStart}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              textColor={textColor}
              backgroundColor={backgroundColor}
              backgroundImage={backgroundImage}
              welcomeText={welcomeText}
              instructionText={instructionText}
              securityText={securityText}
              iconUrl={iconUrl}
            />
          )}
          
          {currentStep === 'selfie' && (
            <SelfieCapture
              key="selfie"
              onCapture={handleSelfieCapture}
              onBack={() => goToStep('welcome')}
              primaryColor={primaryColor}
              logoUrl={logoUrl}
              logoSize={logoSize}
            />
          )}
          
          {currentStep === 'document' && (
            <DocumentCapture
              key="document"
              onCapture={handleDocumentCapture}
              onBack={() => goToStep('selfie')}
              primaryColor={primaryColor}
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
              textColor={textColor}
              logoUrl={logoUrl}
              logoSize={logoSize}
            />
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
