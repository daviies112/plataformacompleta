import { useEffect, useState } from 'react';
import { Gift, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContract } from '@/contexts/ContractContext';
import { useToast } from '@/hooks/use-toast';

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface InitialAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  complement?: string;
}

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
  initialAddress?: InitialAddress;
}

export const ResellerWelcomeStep = (props: ResellerWelcomeStepProps = {}) => {
  const { setCurrentStep, setAddressData, govbrData } = useContract();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    street: props.initialAddress?.street || '',
    number: props.initialAddress?.number || '',
    city: props.initialAddress?.city || '',
    state: props.initialAddress?.state || '',
    zipcode: props.initialAddress?.zipcode || '',
    complement: props.initialAddress?.complement || ''
  });

  useEffect(() => {
    if (props.initialAddress) {
      console.log('[ResellerWelcomeStep] Preenchendo endereço inicial:', props.initialAddress);
      setFormData(prev => ({
        ...prev,
        street: props.initialAddress?.street || prev.street,
        number: props.initialAddress?.number || prev.number,
        city: props.initialAddress?.city || prev.city,
        state: props.initialAddress?.state || prev.state,
        zipcode: props.initialAddress?.zipcode || prev.zipcode,
        complement: props.initialAddress?.complement || prev.complement
      }));
    }
  }, [props.initialAddress]);

  const clientName = props.client_name || 'Nova Revendedora';
  const parabensTitle = props.parabens_title || `Parabéns, ${clientName}!`;
  const parabensSubtitle = props.parabens_subtitle || 'Bem-vinda à família de revendedoras!';
  const parabensDescription = props.parabens_description || 'Sua maleta de produtos chegará em breve. Preencha seu endereço para recebê-la.';
  const parabensCardColor = props.parabens_card_color || '#1f293d';
  const parabensBackgroundColor = props.parabens_background_color || '#ffffff';
  const parabensButtonColor = props.parabens_button_color || '#2c3e50';
  const parabensTextColor = props.parabens_text_color || '#ffffff';
  const parabensFontFamily = props.parabens_font_family || 'Arial, sans-serif';
  const parabensFormTitle = props.parabens_form_title || 'Endereço para Entrega';
  const parabensButtonText = props.parabens_button_text || 'Confirmar Endereço e Continuar';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.street || !formData.number || !formData.city || !formData.state || !formData.zipcode) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      setAddressData({
        street: formData.street,
        number: formData.number,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        complement: formData.complement
      });

      toast({
        title: 'Endereço registrado!',
        description: 'Sua maleta será enviada para o endereço fornecido.'
      });

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
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${parabensButtonColor}1A` }}>
            <Gift className="w-14 h-14" style={{ color: parabensButtonColor }} />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ color: parabensTextColor }}>{parabensTitle}</h1>
          <p className="text-xl mb-2" style={{ color: parabensTextColor }}>{parabensSubtitle}</p>
          <p style={{ color: parabensTextColor }}>{parabensDescription}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg p-6 shadow-sm border" style={{ backgroundColor: `${parabensCardColor}`, borderColor: `${parabensButtonColor}33` }}>
            <div className="flex items-start gap-3">
              <Truck className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: parabensButtonColor }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: parabensTextColor }}>Entrega Gratuita</h3>
                <p className="text-sm" style={{ color: parabensTextColor, opacity: 0.7 }}>Sua maleta será entregue sem custos adicionais no endereço informado.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6 shadow-sm border" style={{ backgroundColor: `${parabensCardColor}`, borderColor: `${parabensButtonColor}33` }}>
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: parabensButtonColor }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: parabensTextColor }}>Receba em Casa</h3>
                <p className="text-sm" style={{ color: parabensTextColor, opacity: 0.7 }}>Você receberá um rastreamento de entrega por email.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg shadow-lg p-8" style={{ backgroundColor: parabensCardColor }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: parabensTextColor }}>{parabensFormTitle}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: parabensTextColor, opacity: 0.8 }}>Rua *</label>
                <Input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Nome da rua"
                  className="w-full text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: parabensTextColor, opacity: 0.8 }}>Número *</label>
                <Input
                  type="text"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  placeholder="Número"
                  className="w-full text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: parabensTextColor, opacity: 0.8 }}>Complemento</label>
              <Input
                type="text"
                name="complement"
                value={formData.complement}
                onChange={handleInputChange}
                placeholder="Apto, bloco, etc (opcional)"
                className="w-full text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: parabensTextColor, opacity: 0.8 }}>Cidade *</label>
              <Input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Nome da cidade"
                className="w-full text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: parabensTextColor, opacity: 0.8 }}>Estado *</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white text-gray-900 appearance-none"
                style={{ borderColor: `${parabensButtonColor}40`, outlineColor: parabensButtonColor }}
              >
                <option value="" className="bg-white text-gray-900">Selecione</option>
                {brazilianStates.map(state => (
                  <option key={state} value={state} className="bg-white text-gray-900">{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: parabensTextColor, opacity: 0.8 }}>CEP *</label>
              <Input
                type="text"
                name="zipcode"
                value={formData.zipcode}
                onChange={handleInputChange}
                placeholder="00000-000"
                className="w-full text-gray-900"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 font-bold text-lg mt-6"
              style={{ backgroundColor: parabensButtonColor, color: '#ffffff' }}
            >
              {isSubmitting ? 'Salvando...' : parabensButtonText}
            </Button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm" style={{ color: parabensTextColor, opacity: 0.6 }}>
          <p>Dados do cliente: <strong>{govbrData?.nome}</strong></p>
          <p>Você poderá atualizar este endereço a qualquer momento no painel de revendedora.</p>
        </div>
      </div>
    </div>
  );
};
