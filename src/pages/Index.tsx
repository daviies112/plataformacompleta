import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometric } from '@/hooks/useBiometric';
import { usePlatform } from '@/platforms/shared/hooks/usePlatform';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { PremiumInput } from '@/platforms/shared/premium/PremiumInput';
import { PremiumSwitch } from '@/platforms/shared/premium/PremiumSwitch';
import { Mail, Lock, Eye, EyeOff, Fingerprint, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import nexusLogo from '@/assets/nexus-logo-full.png';
import { cn } from '@/lib/utils';

const Index = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { authenticateWithBiometric, isAuthenticating, checkSupport } = useBiometric();
  const { isMobile } = usePlatform();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    checkSupport().then((supported) => {
      console.log('✅ Resultado checkSupport:', supported);
      setBiometricSupported(supported);
      console.log('✅ biometricSupported setado para:', supported);
    });
    return () => clearTimeout(timer);
  }, [checkSupport]);

  useEffect(() => {
    console.log('📱 Estado biometricSupported atualizado:', biometricSupported);
  }, [biometricSupported]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('saved_email');
    const savedPassword = localStorage.getItem('saved_password');
    
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email é obrigatório');
      return;
    }

    if (!password) {
      setPasswordError('Senha é obrigatória');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      
      if (!success) {
        setPasswordError('Email ou senha inválidos');
        toast.error('Credenciais inválidas', {
          description: 'Verifique seu email e senha e tente novamente.',
        });
      } else {
        if (rememberMe) {
          localStorage.setItem('saved_email', email);
          localStorage.setItem('saved_password', password);
        } else {
          localStorage.removeItem('saved_email');
          localStorage.removeItem('saved_password');
        }
        
        toast.success('Login realizado com sucesso!', {
          description: 'Bem-vindo de volta ao Nexus Intelligence.',
        });
      }
    } catch (error) {
      setPasswordError('Erro ao conectar com o servidor');
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email) {
      toast.info('Digite seu email', {
        description: 'Digite seu email primeiro para autenticar com biometria.',
      });
      return;
    }

    const authenticatedEmail = await authenticateWithBiometric(email);
    
    if (authenticatedEmail) {
      const success = await login(email, '');
      
      if (success) {
        toast.success('Login biométrico bem-sucedido!', {
          description: 'Bem-vindo de volta!',
        });
      }
    }
  };

  // ✅ REMOVIDO: Loading gate que causava spinner em rotas públicas
  // O isLoading agora começa como false para rotas públicas no AuthContext

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5 animate-gradient pointer-events-none" />
      
      {/* Ambient Light Effects */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-float pointer-events-none" />
      <div 
        className="fixed bottom-0 right-1/3 w-80 h-80 bg-primary/5 rounded-full blur-[100px] animate-float pointer-events-none" 
        style={{ animationDelay: '2s' }} 
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center p-6 py-8">
        <div className="w-full max-w-md mx-auto space-y-4">
          
          {/* Hero Section - Logo & Subtitle */}
          <div 
            className={cn(
              "text-center space-y-3 transition-all duration-700 ease-out",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            )}
          >
            <div className="flex justify-center">
              <img 
                src={nexusLogo} 
                alt="NEXUS" 
                className="h-auto object-contain animate-breathe drop-shadow-[0_0_30px_rgba(212,175,55,0.3)] w-[90vw] max-w-[24rem] lg:max-w-[18rem]"
              />
            </div>
          </div>

          {/* Form Container with Glass Effect */}
          <div 
            className={cn(
              "transition-all duration-700 ease-out delay-150",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <PremiumCard variant="elevated" padding="lg" className="space-y-5 lg:space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-2xl lg:text-xl font-bold text-foreground">Acesso Executivo</h2>
                <p className="text-sm lg:text-xs text-muted-foreground">
                  Entre com suas credenciais para continuar
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-4">
                <PremiumInput
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  error={emailError}
                  icon={Mail}
                  iconPosition="left"
                  required
                  data-testid="input-email"
                />

                <div className="relative">
                  <PremiumInput
                    type={showPassword ? 'text' : 'password'}
                    label="Senha"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    error={passwordError}
                    icon={Lock}
                    iconPosition="left"
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[14px] z-10 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 lg:w-4 lg:h-4" /> : <Eye className="w-5 h-5 lg:w-4 lg:h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <PremiumSwitch
                    label="Lembrar-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="md"
                  />
                </div>

                <div className="space-y-3 lg:space-y-2.5">
                  <PremiumButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full"
                    data-testid="button-login"
                  >
                    {isSubmitting ? (
                      'Entrando...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 lg:w-4 lg:h-4 mr-2" />
                        Entrar
                      </>
                    )}
                  </PremiumButton>

                  {/* Biometric login only available on mobile */}
                  {isMobile && biometricSupported && (
                    <PremiumButton
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={handleBiometricLogin}
                      disabled={isAuthenticating || !email}
                      isLoading={isAuthenticating}
                      className="w-full"
                      data-testid="button-biometric-login"
                    >
                      {isAuthenticating ? (
                        'Autenticando...'
                      ) : (
                        <>
                          <Fingerprint className="w-5 h-5 lg:w-4 lg:h-4 mr-2" />
                          Login com Biometria
                        </>
                      )}
                    </PremiumButton>
                  )}
                </div>
              </form>
            </PremiumCard>
          </div>

          {/* Footer Info */}
          <div 
            className={cn(
              "text-center transition-all duration-700 ease-out delay-300",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <p className="text-xs text-muted-foreground">
              © 2025 Nexus Intelligence. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
