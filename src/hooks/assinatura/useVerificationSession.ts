import { useState, useCallback } from 'react';
import type { VerificationSession, DocumentType, VerificationStep, VerificationResult } from '@/types/verification';

const generateSessionId = () => {
  return `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Safe localStorage wrapper that won't crash on mobile quota exceeded
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[useVerificationSession] localStorage.setItem failed:', e);
    }
  },
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('[useVerificationSession] localStorage.getItem failed:', e);
      return null;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[useVerificationSession] localStorage.removeItem failed:', e);
    }
  }
};

// Helper to create a session metadata object WITHOUT large image data
const createSessionMetadata = (session: VerificationSession) => {
  const { selfieImage, documentImage, ...metadata } = session;
  return {
    ...metadata,
    hasSelfie: !!selfieImage,
    hasDocument: !!documentImage,
  };
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
    
    // Only save metadata (no images) to localStorage
    safeLocalStorage.setItem('currentVerificationSession', JSON.stringify(createSessionMetadata(newSession)));
    
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
      // Only save metadata (no images) to localStorage
      safeLocalStorage.setItem('currentVerificationSession', JSON.stringify(createSessionMetadata(updated)));
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
      // Only save metadata (no images) to localStorage
      safeLocalStorage.setItem('currentVerificationSession', JSON.stringify(createSessionMetadata(updated)));
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
      
      // Only save metadata (no images) to localStorage
      safeLocalStorage.setItem('currentVerificationSession', JSON.stringify(createSessionMetadata(updated)));
      
      // Save to history without images
      const historyJson = safeLocalStorage.getItem('verificationHistory');
      const history = historyJson ? JSON.parse(historyJson) : [];
      history.push(createSessionMetadata(updated));
      
      // Keep history small - only last 10 entries
      if (history.length > 10) {
        history.shift();
      }
      safeLocalStorage.setItem('verificationHistory', JSON.stringify(history));
      
      return updated;
    });
  }, []);

  const resetSession = useCallback(() => {
    setSession(null);
    setCurrentStep('welcome');
    safeLocalStorage.removeItem('currentVerificationSession');
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
