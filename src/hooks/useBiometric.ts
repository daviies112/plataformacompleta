import { useState, useCallback } from 'react';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import { toast } from 'sonner';

export const useBiometric = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const checkSupport = useCallback(async () => {
    const supported = 
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function';
    
    console.log('🔐 Verificação de suporte biométrico:', {
      supported,
      PublicKeyCredential: window.PublicKeyCredential,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
    });
    
    setIsSupported(supported);
    return supported;
  }, []);

  const registerBiometric = useCallback(async (email: string) => {
    try {
      setIsRegistering(true);

      const supported = await checkSupport();
      if (!supported) {
        toast.error('Autenticação biométrica não suportada', {
          description: 'Seu navegador ou dispositivo não suporta autenticação biométrica.',
        });
        return false;
      }

      const optionsResponse = await fetch('/api/biometric/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        toast.error('Erro ao configurar biometria', {
          description: error.error || 'Não foi possível iniciar o registro.',
        });
        return false;
      }

      const { options } = await optionsResponse.json();

      const attResp: RegistrationResponseJSON = await startRegistration(options);

      const verifyResponse = await fetch('/api/biometric/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attResp }),
      });

      const verification = await verifyResponse.json();

      if (verification.verified) {
        toast.success('Biometria configurada!', {
          description: 'Agora você pode fazer login com impressão digital ou Face ID.',
        });
        return true;
      } else {
        toast.error('Falha na verificação', {
          description: 'Não foi possível verificar sua biometria.',
        });
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao registrar biometria:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Registro cancelado', {
          description: 'Você cancelou o registro biométrico.',
        });
      } else if (error.name === 'InvalidStateError') {
        toast.error('Biometria já registrada', {
          description: 'Este dispositivo já está registrado.',
        });
      } else {
        toast.error('Erro ao registrar biometria', {
          description: error.message || 'Tente novamente mais tarde.',
        });
      }
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [checkSupport]);

  const authenticateWithBiometric = useCallback(async (email: string) => {
    try {
      setIsAuthenticating(true);

      const supported = await checkSupport();
      if (!supported) {
        toast.error('Autenticação biométrica não suportada', {
          description: 'Seu navegador ou dispositivo não suporta autenticação biométrica.',
        });
        return null;
      }

      const optionsResponse = await fetch('/api/biometric/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        
        if (optionsResponse.status === 404) {
          toast.info('Biometria não configurada', {
            description: 'Configure sua biometria primeiro para usar este recurso.',
          });
        } else {
          toast.error('Erro ao autenticar', {
            description: error.error || 'Não foi possível iniciar a autenticação.',
          });
        }
        return null;
      }

      const { options } = await optionsResponse.json();

      const asseResp: AuthenticationResponseJSON = await startAuthentication(options);

      const verifyResponse = await fetch('/api/biometric/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: asseResp }),
      });

      const verification = await verifyResponse.json();

      if (verification.verified) {
        toast.success('Autenticação bem-sucedida!', {
          description: 'Bem-vindo de volta!',
        });
        return verification.email;
      } else {
        toast.error('Falha na autenticação', {
          description: 'Não foi possível verificar sua biometria.',
        });
        return null;
      }
    } catch (error: any) {
      console.error('Erro ao autenticar com biometria:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Autenticação cancelada', {
          description: 'Você cancelou a autenticação biométrica.',
        });
      } else {
        toast.error('Erro ao autenticar', {
          description: error.message || 'Tente novamente mais tarde.',
        });
      }
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [checkSupport]);

  return {
    isRegistering,
    isAuthenticating,
    isSupported,
    checkSupport,
    registerBiometric,
    authenticateWithBiometric,
  };
};
