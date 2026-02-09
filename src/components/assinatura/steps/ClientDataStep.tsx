import { useState, useEffect } from 'react';
import { ArrowRight, User, Mail, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContract } from '@/contexts/ContractContext';
import { maskCPF, maskPhone, validateCPF, validateEmail, validatePhone } from '@/lib/validators';

interface ClientData {
  id: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone: string | null;
  contract_html: string;
  protocol_number: string | null;
}

interface ClientDataStepProps {
  clientData?: ClientData;
  onContinue: () => void;
}

export const ClientDataStep = ({ clientData, onContinue }: ClientDataStepProps) => {
  const { setCurrentStep } = useContract();
  const [formData, setFormData] = useState({
    name: clientData?.client_name || '',
    cpf: clientData?.client_cpf ? maskCPF(clientData.client_cpf) : '',
    email: clientData?.client_email || '',
    phone: clientData?.client_phone ? maskPhone(clientData.client_phone) : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    validateForm();
  }, [formData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!(formData.name || '').trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    // CRITICAL: Handle null/undefined cpf to prevent "Cannot read properties of null (reading 'replace')"
    const cpfClean = (formData.cpf || '').replace(/\D/g, '');
    if (!cpfClean) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(cpfClean)) {
      newErrors.cpf = 'CPF inválido';
    }

    if (!(formData.email || '').trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(formData.email || '')) {
      newErrors.email = 'Email inválido';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Telefone inválido';
    }

    setErrors(newErrors);
    setIsValid(Object.keys(newErrors).length === 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    if (name === 'cpf') {
      formattedValue = maskCPF(value);
    } else if (name === 'phone') {
      formattedValue = maskPhone(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleContinue = () => {
    if (isValid) {
      onContinue();
      setCurrentStep(1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Seus Dados</h1>
            </div>
            <p className="text-gray-600">
              Preencha seus dados para continuar com o processo de assinatura.
            </p>
          </div>

          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome Completo
                </span>
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="João da Silva"
                disabled={!!clientData?.client_name}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                  errors.name
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-blue-500 focus:bg-white'
                }`}
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CPF
                </span>
              </label>
              <Input
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                disabled={!!clientData?.client_cpf}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                  errors.cpf
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-blue-500 focus:bg-white'
                }`}
              />
              {errors.cpf && <p className="text-red-600 text-sm mt-1">{errors.cpf}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </span>
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                disabled={!!clientData?.client_email}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                  errors.email
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-blue-500 focus:bg-white'
                }`}
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone (opcional)
                </span>
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(11) 00000-0000"
                disabled={!!clientData?.client_phone}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                  errors.phone
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-blue-500 focus:bg-white'
                }`}
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo Passo - Verificação Facial
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
