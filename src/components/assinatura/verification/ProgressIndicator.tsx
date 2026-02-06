import { motion } from 'framer-motion';
import { Check, Camera, FileText, Cpu, CheckCircle } from 'lucide-react';
import type { VerificationStep } from '@/types/verification';

interface StepLabels {
  selfie: string;
  document: string;
  analysis: string;
  result: string;
}

interface ProgressIndicatorProps {
  currentStep: VerificationStep;
  primaryColor?: string;
  textColor?: string;
  iconColor?: string;
  stepLabels?: StepLabels;
  inactiveCircleColor?: string;
  inactiveTextColor?: string;
}

const defaultStepLabels: StepLabels = {
  selfie: 'Selfie',
  document: 'Documento',
  analysis: 'Análise',
  result: 'Resultado',
};

const stepOrder: Record<VerificationStep, number> = {
  welcome: -1,
  selfie: 0,
  document: 1,
  processing: 2,
  result: 3,
};

export const ProgressIndicator = ({ 
  currentStep, 
  primaryColor = '#2c3e50',
  textColor,
  iconColor,
  stepLabels = defaultStepLabels,
  inactiveCircleColor = '#e5e5e5',
  inactiveTextColor = '#666666'
}: ProgressIndicatorProps) => {
  const currentIndex = stepOrder[currentStep];

  if (currentStep === 'welcome') return null;

  const steps = [
    { id: 'selfie', label: stepLabels.selfie, icon: Camera },
    { id: 'document', label: stepLabels.document, icon: FileText },
    { id: 'processing', label: stepLabels.analysis, icon: Cpu },
    { id: 'result', label: stepLabels.result, icon: CheckCircle },
  ];

  return (
    <div className="w-full py-4 px-6">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: isCompleted ? primaryColor : isCurrent ? primaryColor : inactiveCircleColor,
                    color: isCompleted || isCurrent ? 'white' : inactiveTextColor,
                    boxShadow: isCurrent ? `0 0 0 4px ${primaryColor}40` : 'none'
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: `${primaryColor}4D` }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                <span 
                  className="mt-2 text-xs font-medium transition-colors"
                  style={{ color: isCurrent ? (textColor || undefined) : inactiveTextColor }}
                >
                  {step.label}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className="w-8 sm:w-12 h-0.5 mx-2 -mt-6">
                  <motion.div
                    className="h-full bg-muted rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: primaryColor }}
                      initial={{ width: 0 }}
                      animate={{ width: isCompleted ? '100%' : '0%' }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
