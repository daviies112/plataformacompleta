import { motion } from 'framer-motion';
import { Shield, Camera, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeScreenProps {
  onStart: () => void;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  welcomeText?: string;
  instructionText?: string;
  securityText?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  companyName?: string;
  iconColor?: string;
  buttonTextColor?: string;
}

const steps = [
  {
    icon: Camera,
    title: 'Tire uma selfie',
    description: 'Posicione seu rosto na área indicada',
  },
  {
    icon: FileText,
    title: 'Fotografe seu documento',
    description: 'CNH, RG ou outro documento com foto',
  },
  {
    icon: CheckCircle,
    title: 'Verificação automática',
    description: 'Comparamos sua foto com o documento',
  },
];

export const WelcomeScreen = ({ 
  onStart, 
  primaryColor = '#2c3e50', 
  secondaryColor = '#d9534f',
  textColor = '#000000',
  backgroundColor = '#ffffff',
  welcomeText = '',
  instructionText = '',
  securityText = 'Suas informações são processadas de forma segura e criptografada',
  logoUrl = '',
  logoSize = 'medium',
  companyName = '',
  iconColor = '#2c3e50',
  buttonTextColor = '#ffffff'
}: WelcomeScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[80vh] px-6 py-8 flex items-center justify-center w-full"
      style={{ backgroundColor }}
    >
      <div className="flex flex-col items-center w-full">

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ 
              color: textColor, 
              fontSize: '32px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '12px'
            }}
          >
            {welcomeText || 'Verificação de Identidade'}
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ 
              color: textColor, 
              textAlign: 'center',
              maxWidth: '400px',
              marginBottom: '40px'
            }}
          >
            {instructionText || 'Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.'}
          </motion.p>

        <div className="w-full max-w-sm space-y-3 mb-10">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: iconColor }} />
                <div>
                  <span className="text-sm" style={{ color: textColor }}>{step.title}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-md flex justify-center"
        >
          <Button
            onClick={onStart}
            size="lg"
            className="w-full py-3 text-sm font-semibold rounded-lg transition-all"
            style={{
              backgroundColor: primaryColor,
              color: buttonTextColor,
            }}
            data-testid="button-start-verification"
          >
            Iniciar Verificação
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-xs text-center max-w-xs flex items-center gap-1 justify-center"
          style={{ color: `${textColor}99` }}
        >
          <Shield className="w-3 h-3" style={{ color: iconColor }} />
          {securityText}
        </motion.p>
      </div>
    </motion.div>
  );
};
