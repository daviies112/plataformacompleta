import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'lucide-react';

export default function CreatePaymentLink() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Criar Link de Pagamento</h1>
        <p className="text-muted-foreground">Crie um novo link de pagamento</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Funcionalidade Não Disponível
          </CardTitle>
          <CardDescription>
            Esta funcionalidade está temporariamente desabilitada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A funcionalidade de criação de links de pagamento está em desenvolvimento e será liberada em breve.
            Por enquanto, você pode gerenciar seus produtos e equipe através das outras seções do painel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
