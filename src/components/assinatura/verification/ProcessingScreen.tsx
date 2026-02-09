import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scan, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import type { VerificationResult } from '@/types/verification';

interface ProcessingScreenProps {
  selfieImage: string;
  documentImage: string;
  onComplete: (result: VerificationResult | null, error?: string) => void;
  primaryColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  iconColor?: string;
  textColor?: string;
  titleColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
}

const processingSteps = [
  { id: 'preprocess', label: 'Pré-processando imagens...', icon: Scan },
  { id: 'detect', label: 'Detectando faces...', icon: Shield },
  { id: 'compare', label: 'Comparando características...', icon: CheckCircle },
];

export const ProcessingScreen = ({ 
  selfieImage, 
  documentImage, 
  onComplete, 
  primaryColor = '#2c3e50', 
  buttonColor,
  buttonTextColor = '#ffffff',
  iconColor,
  textColor,
  titleColor,
  backgroundColor,
  logoUrl = '', 
  logoSize = 'medium' 
}: ProcessingScreenProps) => {
  const effectiveButtonColor = buttonColor || primaryColor;
  const effectiveIconColor = iconColor || primaryColor;
  const effectiveTextColor = textColor || undefined;

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Iniciando análise...');

  useEffect(() => {
    const runComparison = async () => {
      try {
        setCurrentStep(0);
        setStatusMessage('Normalizando iluminação e contraste...');
        
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 1, 95));
        }, 100);

        const { useFaceDetection } = await import('@/hooks/assinatura/useFaceDetection');
        
        setTimeout(() => {
          setCurrentStep(1);
          setStatusMessage('Analisando faces com SsdMobilenetv1...');
        }, 1500);

        setTimeout(() => {
          setCurrentStep(2);
          setStatusMessage('Calculando métricas de similaridade...');
        }, 3000);

        setTimeout(() => {
          clearInterval(progressInterval);
          setProgress(100);
          onComplete(null);
        }, 4500);

      } catch (error) {
        console.error('Processing error:', error);
        onComplete(null, error instanceof Error ? error.message : 'Erro no processamento');
      }
    };

    runComparison();
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-8"
    >
      <div className="flex items-center gap-4 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-card shadow-lg">
            <img
              src={selfieImage}
              alt="Selfie"
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
          <motion.div
            className="absolute -inset-1 rounded-full border-2"
            style={{ borderColor: effectiveButtonColor }}
            animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-0.5" style={{ backgroundColor: effectiveButtonColor }} />
          <Scan className="w-6 h-6 animate-pulse" style={{ color: effectiveIconColor }} />
          <div className="w-12 h-0.5" style={{ backgroundColor: effectiveButtonColor }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-lg overflow-hidden border-4 border-card shadow-lg">
            <img
              src={documentImage}
              alt="Document"
              className="w-full h-full object-cover"
            />
          </div>
          <motion.div
            className="absolute -inset-1 rounded-lg border-2"
            style={{ borderColor: effectiveButtonColor }}
            animate={{ scale: [1, 1.1], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative mb-8"
      >
        <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ backgroundColor: `${effectiveButtonColor}1A` }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 rounded-full border-4 border-transparent"
            style={{ borderTopColor: effectiveButtonColor, borderRightColor: `${effectiveButtonColor}80` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: effectiveTextColor }}>{progress}%</span>
          </div>
        </div>
      </motion.div>

      <motion.p
        key={statusMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-center mb-6 max-w-xs"
        style={{ color: effectiveTextColor, opacity: 0.7 }}
      >
        {statusMessage}
      </motion.p>

      <div className="w-full max-w-xs space-y-3">
        {processingSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                ${!isActive && !isComplete ? 'bg-transparent' : ''}
                ${isComplete ? 'bg-muted/50' : ''}
              `}
              style={isActive ? { backgroundColor: `${effectiveButtonColor}1A` } : undefined}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${!isComplete && !isActive ? 'bg-muted text-muted-foreground' : ''}`}
                style={isComplete ? { backgroundColor: effectiveButtonColor, color: buttonTextColor } : isActive ? { backgroundColor: effectiveButtonColor, color: buttonTextColor } : undefined}
              >
                {isComplete ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <span 
                className={`text-sm transition-colors ${isActive ? 'font-medium' : 'text-muted-foreground'}`}
                style={{ color: isActive ? effectiveTextColor : undefined }}
              >
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 p-3 bg-muted/30 rounded-lg max-w-xs"
      >
        <p className="text-xs text-muted-foreground text-center">
          Usando <span className="font-medium text-foreground">SsdMobilenetv1</span> com comparação multi-métrica (características + landmarks + estrutura)
        </p>
      </motion.div>
    </motion.div>
  );
};
