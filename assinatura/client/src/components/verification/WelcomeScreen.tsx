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
  logoSize = 'medium'
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
        {logoUrl && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{
                maxWidth: logoSize === 'small' ? '80px' : logoSize === 'large' ? '150px' : '120px',
                height: 'auto'
              }} 
            />
          </motion.div>
        )}

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ 
              color: textColor, 
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
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
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              textAlign: 'center',
              maxWidth: '400px',
              marginBottom: '40px'
            }}
          >
            {instructionText || 'Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.'}
          </motion.p>

        <div className="w-full max-w-sm space-y-4 mb-10">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/90 border border-white/20 shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}20` }}>
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', color: textColor, margin: '0' }}>{step.title}</h3>
                  <p style={{ fontSize: '14px', color: textColor, opacity: 0.9, margin: '4px 0 0 0' }}>{step.description}</p>
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
            className="h-20 px-12 text-xl font-bold shadow-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            style={{
              backgroundColor: primaryColor,
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Iniciar Verificação
            <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-xs text-center max-w-xs"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)', color: primaryColor }}
        >
          {securityText}
        </motion.p>
      </div>
    </motion.div>
  );
};
