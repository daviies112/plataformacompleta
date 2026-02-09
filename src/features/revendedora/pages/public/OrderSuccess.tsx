import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Home, Package } from 'lucide-react';

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">Pedido Confirmado com Sucesso!</CardTitle>
            <CardDescription className="text-base">
              Seu pedido foi processado e você receberá um e-mail com os detalhes.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações do pedido */}
          <div className="bg-muted p-6 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Número do Pedido</span>
              <span className="font-bold text-lg">{orderNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="font-medium text-green-600">Pagamento Aprovado</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Forma de Pagamento</span>
              <span className="font-medium">Cartão de Crédito</span>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Próximos Passos</h3>
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <p className="text-sm text-muted-foreground">
                  Você receberá um e-mail de confirmação com todos os detalhes do pedido
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <p className="text-sm text-muted-foreground">
                  Seu pedido será processado e preparado para envio
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <p className="text-sm text-muted-foreground">
                  Você receberá o código de rastreamento assim que o pedido for enviado
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/revendedora')}>
              <Home className="mr-2 h-4 w-4" />
              Voltar ao Início
            </Button>
            <Button className="flex-1">
              <Package className="mr-2 h-4 w-4" />
              Rastrear Pedido
            </Button>
          </div>

          {/* Nota fiscal */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Precisa da nota fiscal?
            </p>
            <Button variant="ghost" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Baixar Nota Fiscal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
