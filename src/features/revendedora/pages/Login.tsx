import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('teste@upvendas.com');
  const [password, setPassword] = useState('teste123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/reseller/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, senha: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao fazer login');
        return;
      }

      if (data.success) {
        toast.success('Login realizado com sucesso!');
        navigate('/revendedora/reseller/dashboard');
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            UP Vendas
          </CardTitle>
          <CardDescription>
            Faça login para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="mt-4 p-3 bg-muted/50 rounded text-sm">
              <p className="font-medium mb-1">Credenciais de Teste:</p>
              <p className="text-muted-foreground">Email: teste@upvendas.com</p>
              <p className="text-muted-foreground">Senha: teste123456</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
