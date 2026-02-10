import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometric } from '@/hooks/useBiometric';
import { MobileInput } from '../components/premium/MobileInput';
import { MobileButton } from '../components/premium/MobileButton';
import { MobileCard } from '../components/premium/MobileCard';
import { Mail, Lock, Fingerprint, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import nexusLogo from '@/assets/nexus-logo-full.png';
import { cn } from '@/lib/utils';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { authenticateWithBiometric, isAuthenticating, checkSupport } = useBiometric();
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
    checkSupport().then(setBiometricSupported);
    return () => clearTimeout(timer);
  }, [checkSupport]);

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
      hapticFeedback();
      return;
    }

    if (!password) {
      setPasswordError('Senha é obrigatória');
      hapticFeedback();
      return;
    }

    setIsSubmitting(true);
    hapticFeedback();

    try {
      const success = await login(email, password);
      
      if (!success) {
        setPasswordError('Email ou senha inválidos');
        hapticFeedback();
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
        
        hapticFeedback();
        toast.success('Login realizado com sucesso!', {
          description: 'Bem-vindo de volta ao Nexus Intelligence.',
        });
      }
    } catch (error) {
      setPasswordError('Erro ao conectar com o servidor');
      hapticFeedback();
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    hapticFeedback();

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
        hapticFeedback();
        toast.success('Login biométrico bem-sucedido!', {
          description: 'Bem-vindo de volta!',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <MobileCard variant="elevated" className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-lg font-semibold text-foreground">Carregando...</span>
          </div>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5 animate-gradient" />
      
      {/* Ambient Light Effects */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-float" />
      <div 
        className="fixed bottom-0 right-1/3 w-80 h-80 bg-primary/5 rounded-full blur-[100px] animate-float" 
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
                className="w-96 h-auto object-contain animate-breathe drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]" 
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
            <MobileCard variant="elevated" padding="lg" className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Acesso Executivo</h2>
                <p className="text-sm text-muted-foreground">
                  Entre com suas credenciais para continuar
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <MobileInput
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
                />

                <div className="relative">
                  <MobileInput
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
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(!showPassword);
                      hapticFeedback();
                    }}
                    className="absolute right-4 top-[14px] z-10 p-2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Remember Me Checkbox with Glass Styling */}
                <div 
                  onClick={() => {
                    setRememberMe(!rememberMe);
                    hapticFeedback();
                  }}
                  className="flex items-center gap-3 cursor-pointer touch-manipulation p-2 -ml-2 rounded-lg active:bg-white/5 transition-colors"
                >
                  <div 
                    className={cn(
                      "w-6 h-6 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                      rememberMe 
                        ? "bg-primary border-primary shadow-[0_0_16px_rgba(212,175,55,0.4)]" 
                        : "border-white/20 bg-white/5"
                    )}
                  >
                    {rememberMe && (
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Lembrar minhas credenciais
                  </span>
                </div>

                <MobileButton
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="mt-6"
                >
                  {isSubmitting ? 'Conectando...' : 'Entrar no Sistema'}
                </MobileButton>
              </form>
            </MobileCard>
          </div>

          {/* Biometric/Quick Access Section - Only show if supported */}
          {biometricSupported && (
            <div 
              className={cn(
                "transition-all duration-700 ease-out delay-300",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <MobileCard 
                variant="outlined" 
                padding="md" 
                clickable
                onClick={handleBiometricLogin}
                className={cn("group", isAuthenticating && "pointer-events-none opacity-50")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isAuthenticating ? (
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <Fingerprint className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {isAuthenticating ? 'Autenticando...' : 'Acesso Rápido Biométrico'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isAuthenticating 
                        ? 'Aguardando autenticação biométrica' 
                        : 'Use sua impressão digital ou Face ID'
                      }
                    </p>
                  </div>
                  <div className="text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </div>
                </div>
              </MobileCard>
            </div>
          )}

          {/* Footer Info */}
          <div 
            className={cn(
              "text-center transition-all duration-700 ease-out delay-500",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <p className="text-xs text-muted-foreground/70">
              Acesso seguro com criptografia de ponta a ponta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
