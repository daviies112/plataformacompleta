import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Shield } from 'lucide-react';
import { saveResellerToken, saveProjectName, saveResellerId, saveResellerEmail } from '../lib/resellerAuth';
import { useCompany } from '../contexts/CompanyContext';

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branding, brandingLoading } = useCompany();
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cpfNumbers = cpf.replace(/\D/g, '');

    try {
      const response = await fetch('/api/reseller/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, cpf: cpfNumbers }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao fazer login');
        return;
      }

      if (data.success) {
        if (data.token) {
          saveResellerToken(data.token);
        }
        if (data.tenant?.projectName) {
          saveProjectName(data.tenant.projectName);
        }
        if (data.user?.id) {
          saveResellerId(data.user.id);
        }
        if (data.user?.email) {
          saveResellerEmail(data.user.email);
        }
        await queryClient.invalidateQueries({ queryKey: ['/api/reseller/supabase-config'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/reseller/settings'] });
        toast.success('Login realizado com sucesso!');
        navigate('/revendedora/reseller/dashboard');
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const hasCustomBranding = branding.button_color !== '#9b87f5';

  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="login-loading">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-16 bg-muted rounded-md mx-auto w-32" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: hasCustomBranding
          ? `linear-gradient(135deg, ${branding.background_color} 0%, ${branding.sidebar_background}15 50%, ${branding.background_color} 100%)`
          : undefined,
      }}
      data-testid="login-page"
    >
      <div className="w-full max-w-md space-y-6">
        {branding.logo_url && (
          <div className="flex justify-center" data-testid="login-logo-container">
            <img
              src={branding.logo_url}
              alt={branding.company_name || 'Logo'}
              className="object-contain"
              style={{
                height: branding.logo_size === 'small' ? 48 : branding.logo_size === 'large' ? 120 : 80,
              }}
              data-testid="img-login-logo"
            />
          </div>
        )}

        <Card className="w-full">
          <CardHeader className="text-center">
            {!branding.logo_url && (
              <div className="flex justify-center mb-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: branding.button_color }}
                  data-testid="login-icon-container"
                >
                  <Shield className="w-7 h-7" style={{ color: branding.button_text_color }} />
                </div>
              </div>
            )}
            <CardTitle
              className="text-2xl font-bold"
              style={hasCustomBranding ? { color: branding.heading_color } : undefined}
              data-testid="text-login-title"
            >
              {branding.company_name || 'Plataforma de Revendedores'}
            </CardTitle>
            <CardDescription
              style={hasCustomBranding ? { color: `${branding.text_color}99` } : undefined}
            >
              Faça login para acessar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  style={hasCustomBranding ? { color: branding.text_color } : undefined}
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cpf"
                  style={hasCustomBranding ? { color: branding.text_color } : undefined}
                >
                  CPF
                </Label>
                <Input
                  id="cpf"
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                  data-testid="input-cpf"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                style={hasCustomBranding ? {
                  backgroundColor: branding.button_color,
                  color: branding.button_text_color,
                  borderColor: branding.button_color,
                } : undefined}
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
