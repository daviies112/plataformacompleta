import React, { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import {
  HMSReactiveStore,
  HMSActions,
  HMSStore,
} from '@100mslive/hms-video-store';

interface HMSContextType {
  hmsStore: HMSStore;
  hmsActions: HMSActions;
  isInitialized: boolean;
}

const HMSContext = createContext<HMSContextType | null>(null);

interface HMSProviderProps {
  children: ReactNode;
}

export function HMSProvider({ children }: HMSProviderProps) {
  const managerRef = useRef<HMSReactiveStore | null>(null);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  // Inicializa apenas uma vez
  if (!managerRef.current && !isInitializedRef.current) {
    console.log('[HMSProvider] Inicializando HMSReactiveStore...');
    managerRef.current = new HMSReactiveStore();
    isInitializedRef.current = true;
  }

  const hmsStore = managerRef.current!.getStore();
  const hmsActions = managerRef.current!.getActions();

  useEffect(() => {
    console.log('[HMSProvider] Montado');

    return () => {
      // Cleanup seguro apenas uma vez
      if (isCleaningUpRef.current) {
        console.log('[HMSProvider] Cleanup já em andamento, ignorando...');
        return;
      }

      isCleaningUpRef.current = true;
      console.log('[HMSProvider] Iniciando cleanup...');

      const cleanup = async () => {
        try {
          const isConnected = hmsStore.getState(
            (state: any) => state.room?.isConnected
          );

          if (isConnected && managerRef.current) {
            console.log('[HMSProvider] Desconectando da sala...');
            await hmsActions.leave().catch((err) => {
              console.warn('[HMSProvider] Erro ao sair da sala:', err);
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
          console.log('[HMSProvider] Cleanup concluído');
        } catch (error) {
          console.error('[HMSProvider] Erro no cleanup:', error);
        } finally {
          isCleaningUpRef.current = false;
        }
      };

      cleanup();
    };
  }, []);

  return (
    <HMSContext.Provider
      value={{
        hmsStore,
        hmsActions,
        isInitialized: isInitializedRef.current,
      }}
    >
      {children}
    </HMSContext.Provider>
  );
}

export function useHMS() {
  const context = useContext(HMSContext);
  if (!context) {
    throw new Error('useHMS deve ser usado dentro de HMSProvider');
  }
  return context;
}