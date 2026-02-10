import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface DocumentValidationResult {
  valid: boolean;
  isSelfie: boolean;
  confidence: number;
  issues: string[];
  documentType: string | null;
}

export interface UseDocumentValidationReturn {
  isValidating: boolean;
  error: string | null;
  validationResult: DocumentValidationResult | null;
  validateDocument: (
    image: string,
    documentType: 'CNH' | 'RG' | 'PASSAPORTE',
    side?: 'front' | 'back'
  ) => Promise<DocumentValidationResult>;
  clearError: () => void;
  reset: () => void;
}

const ERROR_MESSAGES = {
  selfie: 'Esta foto parece ser uma selfie. Por favor, fotografe seu documento.',
  notRecognized: 'Documento não reconhecido. Certifique-se de que o documento está bem enquadrado.',
  lowQuality: 'A qualidade da imagem está baixa. Tente novamente com melhor iluminação.',
  generic: 'Não foi possível validar o documento. Por favor, tente novamente.',
  network: 'Erro de conexão. Verifique sua internet e tente novamente.',
};

function getErrorMessage(result: DocumentValidationResult): string {
  if (result.isSelfie) {
    return ERROR_MESSAGES.selfie;
  }

  if (result.issues && result.issues.length > 0) {
    const lowerIssues = result.issues.map(i => i.toLowerCase()).join(' ');
    
    if (lowerIssues.includes('resolução') || lowerIssues.includes('qualidade') || lowerIssues.includes('pequena')) {
      return ERROR_MESSAGES.lowQuality;
    }
    
    if (lowerIssues.includes('proporção') || lowerIssues.includes('formato') || lowerIssues.includes('dimensões')) {
      return ERROR_MESSAGES.notRecognized;
    }
    
    return result.issues[0];
  }

  return ERROR_MESSAGES.notRecognized;
}

export function useDocumentValidation(): UseDocumentValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<DocumentValidationResult | null>(null);

  const validateDocument = useCallback(async (
    image: string,
    documentType: 'CNH' | 'RG' | 'PASSAPORTE',
    side?: 'front' | 'back'
  ): Promise<DocumentValidationResult> => {
    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await apiRequest('POST', '/api/assinatura/public/validate-document', {
        image,
        documentType,
        side,
      });

      const result: DocumentValidationResult = await response.json();
      setValidationResult(result);

      if (!result.valid) {
        const errorMessage = getErrorMessage(result);
        setError(errorMessage);
      }

      return result;
    } catch (err) {
      console.error('Document validation error:', err);
      const errorMessage = ERROR_MESSAGES.network;
      setError(errorMessage);
      
      const failedResult: DocumentValidationResult = {
        valid: false,
        isSelfie: false,
        confidence: 0,
        issues: [errorMessage],
        documentType: null,
      };
      setValidationResult(failedResult);
      return failedResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsValidating(false);
    setError(null);
    setValidationResult(null);
  }, []);

  return {
    isValidating,
    error,
    validationResult,
    validateDocument,
    clearError,
    reset,
  };
}
