import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Shield } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="text-center space-y-8 p-8 max-w-5xl">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          UP Vendas
        </h1>
        <p className="text-xl text-muted-foreground">
          Selecione seu tipo de acesso
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-4">
          <button
            onClick={() => navigate('admin/dashboard')}
            className="group w-full p-8 border-2 rounded-lg bg-card hover:border-primary transition-all hover:shadow-lg"
          >
            <Shield className="h-16 w-16 mb-4 text-primary mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-semibold mb-2">Administrador</h3>
            <p className="text-muted-foreground">
              Gerenciar empresa, produtos, pedidos e revendedores
            </p>
          </button>

          <button
            onClick={() => navigate('reseller/dashboard')}
            className="group w-full p-8 border-2 rounded-lg bg-card hover:border-primary transition-all hover:shadow-lg"
          >
            <ShoppingBag className="h-16 w-16 mb-4 text-primary mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-semibold mb-2">Revendedor</h3>
            <p className="text-muted-foreground">
              Vendas, links de pagamento, comissões e equipe
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
