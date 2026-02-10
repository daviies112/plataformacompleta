import { useState, useCallback } from 'react';
import type { VerificationSession, DocumentType, VerificationStep, VerificationResult } from '@/types/verification';

const generateSessionId = () => {
  return `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useVerificationSession = () => {
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [currentStep, setCurrentStep] = useState<VerificationStep>('welcome');

  const startSession = useCallback(() => {
    const newSession: VerificationSession = {
      id: generateSessionId(),
      startedAt: new Date(),
      status: 'in_progress',
    };
    setSession(newSession);
    setCurrentStep('welcome');
    
    // Store in localStorage
    localStorage.setItem('currentVerificationSession', JSON.stringify(newSession));
    
    return newSession;
  }, []);

  const saveSelfie = useCallback((imageData: string) => {
    setSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        selfieImage: imageData,
        selfieTimestamp: new Date(),
      };
      localStorage.setItem('currentVerificationSession', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveDocument = useCallback((imageData: string, documentType: DocumentType) => {
    setSession(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        documentImage: imageData,
        documentType,
        documentTimestamp: new Date(),
      };
      localStorage.setItem('currentVerificationSession', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const completeVerification = useCallback((score: number, passed: boolean, result?: VerificationResult) => {
    setSession(prev => {
      if (!prev) return null;
      const updated: VerificationSession = {
        ...prev,
        completedAt: new Date(),
        similarityScore: score,
        status: passed ? 'approved' : 'rejected',
        result,
      };
      
      // Store completed session
      localStorage.setItem('currentVerificationSession', JSON.stringify(updated));
      
      // Also add to history
      const history = JSON.parse(localStorage.getItem('verificationHistory') || '[]');
      history.push(updated);
      localStorage.setItem('verificationHistory', JSON.stringify(history));
      
      return updated;
    });
  }, []);

  const resetSession = useCallback(() => {
    setSession(null);
    setCurrentStep('welcome');
    localStorage.removeItem('currentVerificationSession');
  }, []);

  const goToStep = useCallback((step: VerificationStep) => {
    setCurrentStep(step);
  }, []);

  return {
    session,
    currentStep,
    startSession,
    saveSelfie,
    saveDocument,
    completeVerification,
    resetSession,
    goToStep,
  };
};
