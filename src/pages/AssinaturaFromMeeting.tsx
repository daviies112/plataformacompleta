import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AssinaturaFromMeeting() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createContractAndRedirect = async () => {
      const meetingId = searchParams.get('meetingId');
      const fsid = searchParams.get('fsid');
      
      if (!fsid) {
        setError('ID do formulário não encontrado');
        return;
      }

      try {
        const response = await api.post('/api/assinatura/public/contracts/from-meeting', {
          meetingId,
          formSubmissionId: fsid
        });

        if (response.data.success && response.data.contract?.access_token) {
          window.location.href = `/assinar/${response.data.contract.access_token}`;
        } else {
          setError('Não foi possível criar o contrato');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao processar');
      }
    };

    createContractAndRedirect();
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-destructive mb-4">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Preparando seu contrato...</p>
      </div>
    </div>
  );
}
