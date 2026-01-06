import { Gift, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContract } from '@/contexts/ContractContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface ResellerWelcomeStepProps {
  client_name?: string;
  parabens_title?: string;
  parabens_subtitle?: string;
  parabens_description?: string;
  parabens_card_color?: string;
  parabens_background_color?: string;
  parabens_button_color?: string;
  parabens_text_color?: string;
  parabens_font_family?: string;
  parabens_form_title?: string;
  parabens_button_text?: string;
}

export const ResellerWelcomeStep = (props: ResellerWelcomeStepProps = {}) => {
  const { setCurrentStep, setAddressData, govbrData } = useContract();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
    complement: ''
  });

  const clientName = props.client_name || 'Nova Revendedora';
  const parabensTitle = props.parabens_title || `Parabéns, ${clientName}! 🎉`;
  const parabensSubtitle = props.parabens_subtitle || 'Bem-vinda à família de revendedoras!';
  const parabensDescription = props.parabens_description || 'Sua maleta de produtos chegará em breve. Preencha seu endereço para recebê-la.';
  const parabensCardColor = props.parabens_card_color || '#dbeafe';
  const parabensBackgroundColor = props.parabens_background_color || '#f0fdf4';
  const parabensButtonColor = props.parabens_button_color || '#22c55e';
  const parabensTextColor = props.parabens_text_color || '#1e40af';
  const parabensFontFamily = props.parabens_font_family || 'Arial, sans-serif';
  const parabensFormTitle = props.parabens_form_title || 'Endereço para Entrega';
  const parabensButtonText = props.parabens_button_text || 'Confirmar Endereço e Continuar';

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#1351B4']
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state || !formData.zipcode) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save address data to context
      setAddressData({
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        complement: formData.complement
      });

      toast({
        title: 'Endereço registrado!',
        description: 'Sua maleta será enviada para o endereço fornecido.'
      });

      // Move to app promotion step
      setCurrentStep(4);
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar seu endereço.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ fontFamily: parabensFontFamily, backgroundColor: parabensBackgroundColor }}>
      <div className="max-w-2xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <Gift className="w-14 h-14 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ color: parabensTextColor }}>{parabensTitle}</h1>
          <p className="text-xl mb-2" style={{ color: parabensTextColor }}>{parabensSubtitle}</p>
          <p style={{ color: parabensTextColor }}>{parabensDescription}</p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-green-200">
            <div className="flex items-start gap-3">
              <Truck className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Entrega Gratuita</h3>
                <p className="text-sm text-gray-600">Sua maleta será entregue sem custos adicionais no endereço informado.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-200">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Receba em Casa</h3>
                <p className="text-sm text-gray-600">Você receberá um rastreamento de entrega por email.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Form */}
        <div className="bg-white rounded-lg shadow-lg p-8" style={{ backgroundColor: parabensCardColor }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: parabensTextColor }}>{parabensFormTitle}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rua *</label>
                <Input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Nome da rua"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
                <Input
                  type="text"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  placeholder="Número"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
              <Input
                type="text"
                name="complement"
                value={formData.complement}
                onChange={handleInputChange}
                placeholder="Apto, bloco, etc (opcional)"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bairro *</label>
                <Input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleInputChange}
                  placeholder="Seu bairro"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Nome da cidade"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione</option>
                {brazilianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CEP *</label>
              <Input
                type="text"
                name="zipcode"
                value={formData.zipcode}
                onChange={handleInputChange}
                placeholder="00000-000"
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-white font-bold text-lg mt-6"
              style={{ backgroundColor: parabensButtonColor }}
            >
              {isSubmitting ? 'Salvando...' : parabensButtonText}
            </Button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Dados do cliente: <strong>{govbrData?.nome}</strong></p>
          <p>Você poderá atualizar este endereço a qualquer momento no painel de revendedora.</p>
        </div>
      </div>
    </div>
  );
};
