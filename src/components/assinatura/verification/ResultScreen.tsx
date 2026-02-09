import { motion } from 'framer-motion';
import { CheckCircle, XCircle, RotateCcw, Download, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VerificationDetails } from './VerificationDetails';
import type { VerificationSession, VerificationResult } from '@/types/verification';

interface ResultScreenProps {
  session: VerificationSession;
  verificationResult: VerificationResult | null;
  onRetry: () => void;
  onComplete: () => void;
  primaryColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  iconColor?: string;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
}

interface ResultScreenWithTextColorProps extends ResultScreenProps {
  textColor?: string;
}

export const ResultScreen = ({ 
  session, 
  verificationResult, 
  onRetry, 
  onComplete, 
  primaryColor = '#2c3e50', 
  buttonColor,
  buttonTextColor = '#ffffff',
  iconColor,
  textColor = '#000000', 
  logoUrl = '', 
  logoSize = 'medium' 
}: ResultScreenWithTextColorProps) => {
  const effectiveButtonColor = buttonColor || primaryColor;
  const effectiveIconColor = iconColor || primaryColor;

  const passed = session.status === 'approved';
  const score = session.similarityScore || 0;
  const requiredScore = verificationResult?.requiredScore || 55;

  const handleDownloadReport = () => {
    const report = {
      id: session.id,
      date: session.completedAt?.toISOString(),
      status: session.status,
      documentType: session.documentType,
      similarityScore: score.toFixed(2),
      requiredScore: requiredScore,
      confidence: verificationResult?.confidence,
      metrics: verificationResult?.metrics,
      imageQuality: {
        selfie: verificationResult?.selfieQuality,
        document: verificationResult?.documentQuality,
      },
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className={`relative w-28 h-28 rounded-full flex items-center justify-center mb-8 ${!passed ? 'bg-destructive/10' : ''}`}
        style={passed ? { backgroundColor: `${primaryColor}1A` } : undefined}
      >
        {passed ? (
          <CheckCircle className="w-16 h-16" style={{ color: primaryColor }} />
        ) : (
          <XCircle className="w-16 h-16 text-destructive" />
        )}
        <motion.div
          className={`absolute inset-0 rounded-full border-4 ${!passed ? 'border-destructive' : ''}`}
          style={passed ? { borderColor: primaryColor } : undefined}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
        />
        {passed && (
          <motion.div
            className="absolute -inset-2 rounded-full border-2"
            style={{ borderColor: primaryColor }}
            animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: passed ? primaryColor : '#ef4444'
        }}
      >
        {passed ? 'Verificação Aprovada!' : 'Verificação Não Aprovada'}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          color: textColor,
          textAlign: 'center',
          maxWidth: '400px',
          marginBottom: '32px',
          opacity: 0.9
        }}
      >
        {passed 
          ? 'Sua identidade foi verificada com sucesso. Todas as análises foram concluídas.'
          : 'Não foi possível verificar sua identidade. Tente novamente com melhor iluminação.'}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="w-full max-w-2xl rounded-xl p-6 mb-6"
        style={{ backgroundColor: `${primaryColor}0D`, borderWidth: '1px', borderColor: `${primaryColor}33` }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: effectiveIconColor }} />
          O que foi Analisado
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-background rounded-lg text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: primaryColor }}>✓</div>
            <p className="text-sm font-medium text-foreground">Características Faciais</p>
          </div>
          <div className="p-3 bg-background rounded-lg text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: primaryColor }}>✓</div>
            <p className="text-sm font-medium text-foreground">Pontos de Referência</p>
          </div>
          <div className="p-3 bg-background rounded-lg text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: primaryColor }}>✓</div>
            <p className="text-sm font-medium text-foreground">Estrutura Facial</p>
          </div>
          <div className="p-3 bg-background rounded-lg text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: primaryColor }}>✓</div>
            <p className="text-sm font-medium text-foreground">Textura Facial</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Análise realizada usando 4 algoritmos avançados: ArcFace, TripletLoss, CosFace e SphereFace
        </p>
      </motion.div>

      {verificationResult && (
        <div className="w-full max-w-2xl mb-6">
          <VerificationDetails result={verificationResult} />
        </div>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm bg-muted/50 rounded-xl p-4 mb-8"
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">ID da Sessão</span>
            <p className="font-medium text-foreground truncate">{session.id.slice(0, 15)}...</p>
          </div>
          <div>
            <span className="text-muted-foreground">Documento</span>
            <p className="font-medium text-foreground">{session.documentType}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Data</span>
            <p className="font-medium text-foreground">
              {session.completedAt?.toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Hora</span>
            <p className="font-medium text-foreground">
              {session.completedAt?.toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-sm space-y-3"
      >
        {passed ? (
          <>
            <Button
              size="lg"
              onClick={onComplete}
              className="w-full h-14"
              style={{ backgroundColor: effectiveButtonColor, color: buttonTextColor }}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Concluir
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadReport}
              className="w-full h-14"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar Relatório
            </Button>
          </>
        ) : (
          <>
            <Button
              size="lg"
              onClick={onRetry}
              className="w-full h-14"
              style={{ backgroundColor: effectiveButtonColor, color: buttonTextColor }}
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Tentar Novamente
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onComplete}
              className="w-full h-14 text-muted-foreground"
            >
              Cancelar
            </Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};
