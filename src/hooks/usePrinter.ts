import { useState, useEffect, useCallback } from 'react';
import type {
  PrinterConfig,
  CreatePrinterConfig,
  UpdatePrinterConfig,
  PrinterConfigApiResponse,
  GenerateZPLRequest,
  GenerateZPLResponse,
} from '@/features/produto/types/printer.types';

interface UsePrinterReturn {
  defaultConfig: PrinterConfig | null;
  allConfigs: PrinterConfig[];
  isLoading: boolean;
  error: string | null;
  fetchConfigs: () => Promise<void>;
  fetchDefaultConfig: () => Promise<PrinterConfig | null>;
  createConfig: (config: CreatePrinterConfig) => Promise<PrinterConfig | null>;
  updateConfig: (config: UpdatePrinterConfig) => Promise<PrinterConfig | null>;
  deleteConfig: (id: number) => Promise<boolean>;
  setDefaultConfig: (id: number) => Promise<boolean>;
  generateZPL: (request: GenerateZPLRequest) => Promise<GenerateZPLResponse>;
  clearError: () => void;
}

export function usePrinter(): UsePrinterReturn {
  const [defaultConfig, setDefaultConfig] = useState<PrinterConfig | null>(null);
  const [allConfigs, setAllConfigs] = useState<PrinterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchConfigs = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/printer-config');
      const data: PrinterConfigApiResponse = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setAllConfigs(data.data);
      }
    } catch (err) {
      console.error('Error fetching configs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDefaultConfig = useCallback(async (): Promise<PrinterConfig | null> => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/printer-config/default');
      const data: PrinterConfigApiResponse = await response.json();
      
      if (data.success) {
        const config = data.data as PrinterConfig | null;
        setDefaultConfig(config);
        return config;
      }
      return null;
    } catch (err) {
      console.error('Error fetching default config:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConfig = useCallback(async (
    config: CreatePrinterConfig
  ): Promise<PrinterConfig | null> => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await fetch('/api/printer-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      const data: PrinterConfigApiResponse = await response.json();
      
      if (data.success && data.data && !Array.isArray(data.data)) {
        await fetchConfigs();
        if (data.data.isDefault) {
          setDefaultConfig(data.data);
        }
        return data.data;
      } else {
        setError(data.error || 'Erro ao criar configuração');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro de conexão';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfigs, clearError]);

  const updateConfig = useCallback(async (
    config: UpdatePrinterConfig
  ): Promise<PrinterConfig | null> => {
    setIsLoading(true);
    clearError();
    
    try {
      const { id, ...updateData } = config;
      const response = await fetch(`/api/printer-config/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      const data: PrinterConfigApiResponse = await response.json();
      
      if (data.success && data.data && !Array.isArray(data.data)) {
        await fetchConfigs();
        if (data.data.isDefault) {
          setDefaultConfig(data.data);
        }
        return data.data;
      } else {
        setError(data.error || 'Erro ao atualizar configuração');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro de conexão';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfigs, clearError]);

  const deleteConfig = useCallback(async (id: number): Promise<boolean> => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await fetch(`/api/printer-config/${id}`, {
        method: 'DELETE',
      });
      
      const data: PrinterConfigApiResponse = await response.json();
      
      if (data.success) {
        await fetchConfigs();
        if (defaultConfig?.id === id) {
          await fetchDefaultConfig();
        }
        return true;
      } else {
        setError(data.error || 'Erro ao excluir configuração');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro de conexão';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfigs, fetchDefaultConfig, defaultConfig, clearError]);

  const setDefaultConfigById = useCallback(async (id: number): Promise<boolean> => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await fetch(`/api/printer-config/set-default/${id}`, {
        method: 'POST',
      });
      
      const data: PrinterConfigApiResponse = await response.json();
      
      if (data.success && data.data && !Array.isArray(data.data)) {
        setDefaultConfig(data.data);
        await fetchConfigs();
        return true;
      } else {
        setError(data.error || 'Erro ao definir configuração padrão');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro de conexão';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfigs, clearError]);

  const generateZPL = useCallback(async (
    request: GenerateZPLRequest
  ): Promise<GenerateZPLResponse> => {
    try {
      const response = await fetch('/api/label-designer/generate-zpl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      const data: GenerateZPLResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar ZPL';
      return { success: false, error: errorMessage };
    }
  }, []);

  useEffect(() => {
    fetchDefaultConfig();
    fetchConfigs();
  }, []);

  return {
    defaultConfig,
    allConfigs,
    isLoading,
    error,
    fetchConfigs,
    fetchDefaultConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig: setDefaultConfigById,
    generateZPL,
    clearError,
  };
}

export default usePrinter;
