import { useState, useEffect, useRef } from 'react';
import {
  Shield, Camera, FileText, CheckCircle, ArrowLeft,
  CreditCard, Scan, MapPin, Loader2, Check, Upload, RefreshCw
} from 'lucide-react';

interface SignatureFlowPreviewProps {
  backgroundColor: string;
  titleColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  iconColor: string;
  logoUrl: string;
  logoSize: 'small' | 'medium' | 'large';
  contractPreviewHtml?: string;
}

const logoSizeMap = { small: 48, medium: 80, large: 120 };
const TOTAL_STEPS = 8;

const STEP_LABELS = [
  'Boas-vindas',
  'Selfie',
  'Documento',
  'Processando',
  'Resultado',
  'Contrato',
  'Residência',
  'Conclusão',
];

export function SignatureFlowPreview({
  backgroundColor,
  titleColor,
  textColor,
  buttonColor,
  buttonTextColor,
  iconColor,
  logoUrl,
  logoSize,
  contractPreviewHtml,
}: SignatureFlowPreviewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [processingChecks, setProcessingChecks] = useState<boolean[]>([false, false, false]);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (step: number) => {
    if (transitioning) return;
    setTransitioning(true);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setCurrentStep(step);
      setTransitioning(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const next = () => {
    if (currentStep < TOTAL_STEPS - 1) goTo(currentStep + 1);
  };

  const prev = () => {
    if (currentStep > 0) goTo(currentStep - 1);
  };

  useEffect(() => {
    if (currentStep === 3) {
      setProcessingChecks([false, false, false]);
      const t1 = setTimeout(() => setProcessingChecks(p => [true, p[1], p[2]]), 600);
      const t2 = setTimeout(() => setProcessingChecks(p => [p[0], true, p[2]]), 1200);
      const t3 = setTimeout(() => setProcessingChecks([true, true, true]), 1700);
      const t4 = setTimeout(() => goTo(4), 2200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [currentStep]);

  const logoEl = logoUrl ? (
    <img
      src={logoUrl}
      alt="Logo"
      style={{ height: logoSizeMap[logoSize], objectFit: 'contain' as const }}
      className="mx-auto"
      data-testid="preview-flow-logo"
    />
  ) : null;

  const renderStepDots = () => (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          data-testid={`step-dot-${i}`}
          title={STEP_LABELS[i]}
          className="rounded-full transition-all duration-200"
          style={{
            width: i === currentStep ? 16 : 6,
            height: 6,
            backgroundColor: i === currentStep ? buttonColor : `${iconColor}40`,
          }}
        />
      ))}
    </div>
  );

  const backButton = currentStep > 0 && currentStep !== 3 ? (
    <button
      onClick={prev}
      data-testid="button-preview-back"
      className="flex items-center gap-1 text-xs mb-2"
      style={{ color: iconColor }}
    >
      <ArrowLeft className="w-3 h-3" /> Voltar
    </button>
  ) : null;

  const actionButton = (label: string, testId: string, onClick: () => void) => (
    <button
      onClick={onClick}
      data-testid={testId}
      className="w-full py-2.5 rounded-lg font-semibold text-xs transition-all"
      style={{ backgroundColor: buttonColor, color: buttonTextColor }}
    >
      {label}
    </button>
  );

  const renderWelcome = () => (
    <div className="flex flex-col items-center text-center space-y-4">
      {logoEl}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: buttonColor }}
      >
        <Shield className="w-7 h-7" style={{ color: buttonTextColor }} />
      </div>
      <h2 className="text-base font-bold" style={{ color: titleColor }} data-testid="preview-title">
        Verificação de Identidade
      </h2>
      <p className="text-xs leading-relaxed" style={{ color: textColor }} data-testid="preview-text">
        Processo seguro e rápido para confirmar sua identidade.
      </p>
      <div className="w-full space-y-2">
        {[
          { Icon: Camera, text: 'Tire uma selfie rápida' },
          { Icon: FileText, text: 'Fotografe seu documento' },
          { Icon: CheckCircle, text: 'Verificação automática' },
        ].map(({ Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 p-2.5 rounded-lg"
            style={{ backgroundColor: `${buttonColor}10` }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />
            <span className="text-xs text-left" style={{ color: textColor }}>{text}</span>
          </div>
        ))}
      </div>
      {actionButton('Iniciar Verificação', 'preview-button-start', next)}
      <p className="text-[10px] flex items-center gap-1" style={{ color: `${textColor}99` }}>
        <Shield className="w-3 h-3" style={{ color: iconColor }} />
        Suas informações são processadas de forma segura
      </p>
    </div>
  );

  const renderSelfie = () => (
    <div className="flex flex-col items-center text-center space-y-4">
      {logoEl}
      {backButton}
      <h2 className="text-base font-bold" style={{ color: titleColor }}>Selfie</h2>
      <div
        className="w-32 h-32 rounded-full flex items-center justify-center"
        style={{ border: `2px dashed ${iconColor}60` }}
      >
        <Camera className="w-10 h-10" style={{ color: `${iconColor}80` }} />
      </div>
      <p className="text-xs" style={{ color: textColor }}>Posicione seu rosto na área indicada</p>
      {actionButton('Capturar Selfie', 'preview-button-selfie', next)}
    </div>
  );

  const renderDocument = () => (
    <div className="flex flex-col items-center text-center space-y-4">
      {logoEl}
      {backButton}
      <h2 className="text-base font-bold" style={{ color: titleColor }}>Documento</h2>
      <div className="flex gap-2">
        {['CNH', 'RG', 'RNE'].map((doc, i) => (
          <span
            key={doc}
            className="px-3 py-1 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: i === 0 ? buttonColor : `${iconColor}15`,
              color: i === 0 ? buttonTextColor : textColor,
            }}
          >
            {doc}
          </span>
        ))}
      </div>
      <div
        className="w-full h-28 rounded-lg flex items-center justify-center"
        style={{ border: `2px dashed ${iconColor}60` }}
      >
        <FileText className="w-10 h-10" style={{ color: `${iconColor}80` }} />
      </div>
      <p className="text-xs" style={{ color: textColor }}>Posicione o documento</p>
      {actionButton('Capturar Documento', 'preview-button-document', next)}
    </div>
  );

  const processingSteps = [
    { label: 'Pré-processando', Icon: Scan },
    { label: 'Detectando faces', Icon: Shield },
    { label: 'Comparando', Icon: CheckCircle },
  ];

  const renderProcessing = () => (
    <div className="flex flex-col items-center text-center space-y-4 py-4">
      {logoEl}
      <h2 className="text-base font-bold" style={{ color: titleColor }}>Processando...</h2>
      <Loader2
        className="w-10 h-10 animate-spin"
        style={{ color: iconColor }}
      />
      <div className="w-full space-y-2">
        {processingSteps.map(({ label, Icon }, i) => (
          <div key={label} className="flex items-center gap-2 text-xs" style={{ color: textColor }}>
            {processingChecks[i] ? (
              <Check className="w-4 h-4" style={{ color: buttonColor }} />
            ) : (
              <Icon className="w-4 h-4" style={{ color: iconColor }} />
            )}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col items-center text-center space-y-4 py-4">
      {logoEl}
      <CheckCircle className="w-16 h-16" style={{ color: buttonColor }} />
      <h2 className="text-base font-bold" style={{ color: titleColor }}>Verificação Aprovada</h2>
      <p className="text-xs" style={{ color: textColor }}>Identidade confirmada com sucesso</p>
      {actionButton('Continuar', 'preview-button-result', next)}
    </div>
  );

  const renderContract = () => (
    <div className="flex flex-col items-center text-center space-y-3">
      {logoEl}
      {backButton}
      <h2 className="text-base font-bold" style={{ color: titleColor }}>Contrato</h2>
      {contractPreviewHtml ? (
        <div
          className="w-full text-left text-[10px] leading-relaxed overflow-y-auto rounded-lg p-2"
          style={{
            color: textColor,
            maxHeight: 150,
            border: `1px solid ${iconColor}20`,
          }}
          dangerouslySetInnerHTML={{ __html: contractPreviewHtml }}
        />
      ) : (
        <div className="w-full space-y-2">
          {[1, 2, 3].map(n => (
            <div key={n} className="w-full rounded" style={{ height: 8, backgroundColor: `${textColor}15` }} />
          ))}
          <div className="w-3/4 rounded" style={{ height: 8, backgroundColor: `${textColor}15` }} />
        </div>
      )}
      <label className="flex items-center gap-2 text-[10px]" style={{ color: textColor }}>
        <input type="checkbox" data-testid="preview-contract-checkbox" />
        Li e aceito os termos
      </label>
      <div className="w-full pt-2 border-t" style={{ borderColor: `${textColor}20` }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: `${textColor}20` }} />
          <span className="text-[10px]" style={{ color: `${textColor}60` }}>Assinatura</span>
        </div>
      </div>
      {actionButton('Assinar Contrato', 'preview-button-contract', next)}
    </div>
  );

  const renderResidenceProof = () => (
    <div className="flex flex-col items-center text-center space-y-4">
      {logoEl}
      {backButton}
      <h2 className="text-base font-bold" style={{ color: titleColor }}>Comprovante de Residência</h2>
      <p className="text-xs" style={{ color: textColor }}>Tire uma foto de um comprovante recente</p>
      <div
        className="w-full h-28 rounded-lg flex flex-col items-center justify-center gap-2"
        style={{ border: `2px dashed ${iconColor}60` }}
      >
        <Camera className="w-8 h-8" style={{ color: `${iconColor}80` }} />
        <span className="text-[10px]" style={{ color: `${textColor}80` }}>Toque para capturar</span>
      </div>
      {actionButton('Capturar Comprovante', 'preview-button-residence', next)}
    </div>
  );

  const renderCongratulations = () => (
    <div className="flex flex-col items-center text-center space-y-4 py-6">
      {logoEl}
      <CheckCircle className="w-16 h-16" style={{ color: buttonColor }} />
      <h2 className="text-lg font-bold" style={{ color: titleColor }}>Parabéns!</h2>
      <p className="text-xs" style={{ color: textColor }}>Processo concluído com sucesso</p>
      {actionButton('Reiniciar Preview', 'preview-button-restart', () => goTo(0))}
    </div>
  );

  const steps = [
    renderWelcome,
    renderSelfie,
    renderDocument,
    renderProcessing,
    renderResult,
    renderContract,
    renderResidenceProof,
    renderCongratulations,
  ];

  return (
    <div className="rounded-[2rem] border-4 border-foreground/20 overflow-hidden shadow-xl" data-testid="signature-flow-preview">
      <div className="bg-foreground/20 h-6 flex items-center justify-center">
        <div className="w-16 h-3 rounded-full bg-foreground/30" />
      </div>
      <div
        style={{
          backgroundColor,
          minHeight: 480,
          fontFamily: 'Arial, sans-serif',
          transition: 'opacity 150ms ease',
          opacity: transitioning ? 0 : 1,
        }}
      >
        {renderStepDots()}
        <div className="px-5 pb-5">
          {steps[currentStep]()}
        </div>
      </div>
    </div>
  );
}
