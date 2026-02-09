import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface BrandingBackgroundProps {
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  logoPosition?: 'center' | 'left' | 'right';
  backgroundImage?: string;
  backgroundColor?: string;
  primaryColor?: string;
  buttonTextColor?: string;
  onContinue: () => void;
}

export const BrandingBackground = ({
  logoUrl = '',
  logoSize = 'medium',
  logoPosition = 'center',
  backgroundImage = '',
  backgroundColor = '#ffffff',
  primaryColor = '#2c3e50',
  buttonTextColor = '#ffffff',
  onContinue,
}: BrandingBackgroundProps) => {
  const getLogoSize = () => {
    switch (logoSize) {
      case 'small':
        return '100px';
      case 'large':
        return '280px';
      default:
        return '200px';
    }
  };

  const getLogoPositioning = () => {
    if (logoPosition === 'left') {
      return { marginRight: 'auto', marginLeft: '40px' };
    }
    if (logoPosition === 'right') {
      return { marginLeft: 'auto', marginRight: '40px' };
    }
    return { margin: '0 auto' };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen w-full"
      style={{
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-black/40"
          style={{ zIndex: 1 }}
        />
      )}

      <div
        className="relative z-10 flex flex-col items-center justify-center h-full gap-8 px-6 py-12"
        style={{ width: '100%', maxWidth: '600px' }}
      >
        {logoUrl && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotateX: -90 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
            style={{
              ...getLogoPositioning(),
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: logoPosition === 'center' ? 'center' : 'flex-start',
            }}
          >
            <img
              src={logoUrl}
              alt="Logo da Empresa"
              style={{
                maxWidth: getLogoSize(),
                height: 'auto',
                maxHeight: '400px',
                filter: backgroundImage ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'none',
              }}
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-auto"
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="gap-2 px-8 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
            style={{
              backgroundColor: primaryColor,
              color: buttonTextColor,
            }}
          >
            Continuar
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
