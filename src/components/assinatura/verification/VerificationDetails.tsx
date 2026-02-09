import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Shield, Scan, Star, Cpu } from 'lucide-react';
import type { VerificationResult, AlgorithmResult } from '@/types/verification';

interface VerificationDetailsProps {
  result: VerificationResult;
}

const MetricBar = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) => {
  const getBarColor = (value: number) => {
    if (value >= 70) return 'bg-accent';
    if (value >= 50) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-2 rounded-full ${getBarColor(value)}`}
        />
      </div>
    </div>
  );
};

const AlgorithmCard = ({
  name,
  description,
  result,
  isPrimary,
}: {
  name: string;
  description: string;
  result: AlgorithmResult;
  isPrimary?: boolean;
}) => {
  const getStatusColor = (matched: boolean) => 
    matched ? 'text-accent' : 'text-destructive';
  
  const getStatusBg = (matched: boolean) => 
    matched ? 'bg-accent/10' : 'bg-destructive/10';

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return confidence;
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${isPrimary ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isPrimary && <Star className="w-4 h-4 text-primary" />}
          <span className="font-medium text-foreground text-sm">{name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBg(result.matched)} ${getStatusColor(result.matched)}`}>
          {result.matched ? 'Aprovado' : 'Reprovado'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Score:</span>
          <p className="font-semibold text-foreground">{result.score}%</p>
        </div>
        <div>
          <span className="text-muted-foreground">Confiança:</span>
          <p className="font-semibold text-foreground">{getConfidenceLabel(result.confidence)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">
            {result.angle !== undefined ? 'Ângulo:' : result.cosine !== undefined ? 'Cosseno:' : 'Distância:'}
          </span>
          <p className="font-semibold text-foreground">
            {result.angle !== undefined ? `${result.angle.toFixed(1)}°` : 
             result.cosine !== undefined ? result.cosine.toFixed(3) : 
             result.distance?.toFixed(3) || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const VerificationDetails = ({ result }: VerificationDetailsProps) => {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-accent';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="w-5 h-5" />;
      case 'medium': return <AlertCircle className="w-5 h-5" />;
      case 'low': return <XCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return confidence;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-xl border border-border p-5 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Detalhes da Análise</h3>
        <div className={`flex items-center gap-2 ${getConfidenceColor(result.confidence)}`}>
          {getConfidenceIcon(result.confidence)}
          <span className="text-sm font-medium">
            Confiança {getConfidenceLabel(result.confidence)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Score Final</p>
          <p className="text-2xl font-bold text-foreground">{result.score}%</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Requerido</p>
          <p className="text-xl font-semibold text-muted-foreground">{result.requiredScore}%</p>
        </div>
      </div>

      {result.algorithms && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Análise por Algoritmo
            </h4>
          </div>
          
          <div className="grid gap-2">
            <AlgorithmCard
              name="ArcFace"
              description="Margem Angular (SOTA - 99.8% LFW)"
              result={result.algorithms.arcface}
              isPrimary={true}
            />
            <AlgorithmCard
              name="TripletLoss"
              description="Google FaceNet - Distância Euclidiana"
              result={result.algorithms.triplet}
            />
            <AlgorithmCard
              name="CosFace"
              description="Margem Cosseno - Discriminação Linear"
              result={result.algorithms.cosface}
            />
            <AlgorithmCard
              name="SphereFace"
              description="Angular Softmax - Espaço Hipersférico"
              result={result.algorithms.sphereface}
            />
          </div>
        </div>
      )}

      {result.ensembleStats && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Estatísticas do Ensemble
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Score Ponderado:</span>
              <p className="font-semibold text-foreground">{result.ensembleStats.weightedScore}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Algoritmos Aprovados:</span>
              <p className="font-semibold text-foreground">{result.ensembleStats.votes}/4</p>
            </div>
            <div>
              <span className="text-muted-foreground">Variância:</span>
              <p className="font-semibold text-foreground">{result.ensembleStats.variance}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Threshold Usado:</span>
              <p className="font-semibold text-foreground">{result.ensembleStats.threshold}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Métricas de Comparação
        </h4>
        
        <div className="space-y-4">
          <MetricBar
            label="Características Faciais"
            value={result.metrics.euclidean}
            icon={<Scan className="w-4 h-4" />}
          />
          <MetricBar
            label="Similaridade Cosseno"
            value={result.metrics.cosine}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <MetricBar
            label="Pontos de Referência"
            value={result.metrics.landmarks}
            icon={<Shield className="w-4 h-4" />}
          />
          <MetricBar
            label="Proporções Estruturais"
            value={result.metrics.structural}
            icon={<Shield className="w-4 h-4" />}
          />
          {result.metrics.texture !== undefined && (
            <MetricBar
              label="Textura Facial"
              value={result.metrics.texture}
              icon={<Scan className="w-4 h-4" />}
            />
          )}
          {result.metrics.histogram !== undefined && (
            <MetricBar
              label="Histograma"
              value={result.metrics.histogram}
              icon={<TrendingUp className="w-4 h-4" />}
            />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Qualidade das Imagens
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Selfie</p>
            <p className="text-lg font-semibold text-foreground">{result.selfieQuality}%</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Documento</p>
            <p className="text-lg font-semibold text-foreground">{result.documentQuality}%</p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Como funciona:</span> Utilizamos 4 algoritmos avançados de reconhecimento facial (ArcFace 40%, TripletLoss 20%, CosFace 25%, SphereFace 15%) em conjunto com pré-processamento CLAHE e normalização de iluminação. O threshold é ajustado dinamicamente baseado na qualidade das imagens e consenso entre algoritmos.
        </p>
      </div>
    </motion.div>
  );
};
