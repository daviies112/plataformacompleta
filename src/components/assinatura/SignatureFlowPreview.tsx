import { useState, useEffect, useRef } from 'react';
import {
  Shield, Camera, FileText, CheckCircle, ArrowLeft,
  CreditCard, Scan, MapPin, Loader2, Check, Upload, RefreshCw,
  Smartphone, Monitor
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
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDesktop = viewMode === 'desktop';

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
      className={isDesktop ? '' : 'mx-auto'}
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
      className={`flex items-center gap-1 mb-2 ${isDesktop ? 'text-sm' : 'text-xs'}`}
      style={{ color: iconColor }}
    >
      <ArrowLeft className={isDesktop ? 'w-4 h-4' : 'w-3 h-3'} /> Voltar
    </button>
  ) : null;

  const actionButton = (label: string, testId: string, onClick: () => void) => (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full rounded-lg font-semibold transition-all ${isDesktop ? 'py-3 text-sm max-w-md' : 'py-2.5 text-xs'}`}
      style={{ backgroundColor: buttonColor, color: buttonTextColor }}
    >
      {label}
    </button>
  );

  const renderWelcome = () => (
    <div className={`flex flex-col items-center text-center ${isDesktop ? 'space-y-5' : 'space-y-4'}`}>
      {logoEl}
      <div
        className={`rounded-full flex items-center justify-center ${isDesktop ? 'w-16 h-16' : 'w-14 h-14'}`}
        style={{ backgroundColor: buttonColor }}
      >
        <Shield className={isDesktop ? 'w-8 h-8' : 'w-7 h-7'} style={{ color: buttonTextColor }} />
      </div>
      <h2 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`} style={{ color: titleColor }} data-testid="preview-title">
        Verificação de Identidade
      </h2>
      <p className={`leading-relaxed ${isDesktop ? 'text-sm max-w-lg' : 'text-xs'}`} style={{ color: textColor }} data-testid="preview-text">
        Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.
      </p>
      <div className={`w-full space-y-2 ${isDesktop ? 'max-w-md' : ''}`}>
        {[
          { Icon: Camera, text: 'Tire uma selfie rápida' },
          { Icon: FileText, text: 'Fotografe seu documento' },
          { Icon: CheckCircle, text: 'Verificação automática' },
        ].map(({ Icon, text }) => (
          <div
            key={text}
            className={`flex items-center gap-2 rounded-lg ${isDesktop ? 'p-3' : 'p-2.5'}`}
            style={{ backgroundColor: `${buttonColor}10` }}
          >
            <Icon className={`flex-shrink-0 ${isDesktop ? 'w-5 h-5' : 'w-4 h-4'}`} style={{ color: iconColor }} />
            <span className={`text-left ${isDesktop ? 'text-sm' : 'text-xs'}`} style={{ color: textColor }}>{text}</span>
          </div>
        ))}
      </div>
      {actionButton('Iniciar Verificação', 'preview-button-start', next)}
      <p className={`flex items-center gap-1 ${isDesktop ? 'text-xs' : 'text-[10px]'}`} style={{ color: `${textColor}99` }}>
        <Shield className="w-3 h-3" style={{ color: iconColor }} />
        Suas informações são processadas de forma segura
      </p>
    </div>
  );

  const renderSelfie = () => (
    <div className={`flex flex-col items-center text-center ${isDesktop ? 'space-y-5' : 'space-y-4'}`}>
      {logoEl}
      {backButton}
      <h2 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`} style={{ color: titleColor }}>Selfie</h2>
      <div
        className={`rounded-full flex items-center justify-center ${isDesktop ? 'w-40 h-40' : 'w-32 h-32'}`}
        style={{ border: `2px dashed ${iconColor}60` }}
      >
        <Camera className={isDesktop ? 'w-14 h-14' : 'w-10 h-10'} style={{ color: `${iconColor}80` }} />
      </div>
      <p className={isDesktop ? 'text-sm' : 'text-xs'} style={{ color: textColor }}>Posicione seu rosto na área indicada</p>
      {actionButton('Capturar Selfie', 'preview-button-selfie', next)}
    </div>
  );

  const renderDocument = () => (
    <div className={`flex flex-col items-center text-center ${isDesktop ? 'space-y-5' : 'space-y-4'}`}>
      {logoEl}
      {backButton}
      <h2 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`} style={{ color: titleColor }}>Documento</h2>
      <div className={`flex ${isDesktop ? 'gap-3' : 'gap-2'}`}>
        {['CNH', 'RG', 'RNE'].map((doc, i) => (
          <span
            key={doc}
            className={`rounded-full font-medium ${isDesktop ? 'px-4 py-1.5 text-xs' : 'px-3 py-1 text-[10px]'}`}
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
        className={`w-full rounded-lg flex items-center justify-center ${isDesktop ? 'h-36 max-w-md' : 'h-28'}`}
        style={{ border: `2px dashed ${iconColor}60` }}
      >
        <FileText className={isDesktop ? 'w-14 h-14' : 'w-10 h-10'} style={{ color: `${iconColor}80` }} />
      </div>
      <p className={isDesktop ? 'text-sm' : 'text-xs'} style={{ color: textColor }}>Posicione o documento</p>
      {actionButton('Capturar Documento', 'preview-button-document', next)}
    </div>
  );

  const processingStepsList = [
    { label: 'Pré-processando', Icon: Scan },
    { label: 'Detectando faces', Icon: Shield },
    { label: 'Comparando', Icon: CheckCircle },
  ];

  const renderProcessing = () => (
    <div className={`flex flex-col items-center text-center py-4 ${isDesktop ? 'space-y-5' : 'space-y-4'}`}>
      {logoEl}
      <h2 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`} style={{ color: titleColor }}>Processando...</h2>
      <Loader2
        className={`animate-spin ${isDesktop ? 'w-12 h-12' : 'w-10 h-10'}`}
        style={{ color: iconColor }}
      />
      <div className={`w-full space-y-2 ${isDesktop ? 'max-w-sm' : ''}`}>
        {processingStepsList.map(({ label, Icon }, i) => (
          <div key={label} className={`flex items-center gap-2 ${isDesktop ? 'text-sm' : 'text-xs'}`} style={{ color: textColor }}>
            {processingChecks[i] ? (
              <Check className={isDesktop ? 'w-5 h-5' : 'w-4 h-4'} style={{ color: buttonColor }} />
            ) : (
              <Icon className={isDesktop ? 'w-5 h-5' : 'w-4 h-4'} style={{ color: iconColor }} />
            )}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderResult = () => (
    <div className={`flex flex-col items-center text-center py-4 ${isDesktop ? 'space-y-5' : 'space-y-4'}`}>
      {logoEl}
      <CheckCircle className={isDesktop ? 'w-20 h-20' : 'w-16 h-16'} style={{ color: buttonColor }} />
      <h2 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`} style={{ color: titleColor }}>Verificação Aprovada</h2>
      <p className={isDesktop ? 'text-sm' : 'text-xs'} style={{ color: textColor }}>Identidade confirmada com sucesso</p>
      {actionButton('Continuar', 'preview-button-result', next)}
    </div>
  );

  const renderContract = () => (
    <div className={`flex flex-col items-center text-center ${isDesktop ? 'space-y-4' : 'space-y-3'}`}>
      {logoEl}
      {backButton}
      <h2 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`} style={{ color: titleColor }}>Contrato</h2>
      {contractPreviewHtml ? (
        <div
          className={`w-full text-left leading-relaxed overflow-y-auto rounded-lg ${isDesktop ? 'text-xs p-3 max-w-lg' : 'text-[10px] p-2'}`}
          style={{
            color: textColor,
            maxHeight: isDesktop ? 200 : 150,
            border: `1px solid ${iconColor}20`,
          }}
          dangerouslySetInnerHTML={{ __html: contractPreviewHtml }}
        />
      ) : (
        <div className={`w-full space-y-2 ${isDesktop ? 'max-w-lg' : ''}`}>
          {[1, 2, 3].map(n => (
            <div key={n} className="w-full rounded" style={{ height: isDesktop ? 10 : 8, backgroundColor: `${textColor}15` }} />
          ))}
          <div className="w-3/4 rounded" style={{ height: isDesktop ? 10 : 8, backgroundColor: `${textColor}15` }} />
        </div>
      )}
      <label className={`flex items-center gap-2 ${isDesktop ? 'text-xs' : 'text-[10px]'}`} style={{ color: textColor }}>
        <input type="checkbox" data-testid="preview-contract-checkbox" />
        Li e aceito os termos
      </label>
      <div className={`w-full pt-2 border-t ${isDesktop ? 'max-w-md' : ''}`} style={{ borderColor: `${textColor}20` }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: `${textColor}20` }} />
          <span className={isDesktop ? 'text-xs' : 'text-[10px]'} style={{ color: `${textColor}60` }}>Assinatura</span>
        </div>
      </div>
      {actionButton('Assinar Contrato', 'preview-button-contract', next)}
    </div>
  );

  const renderResidenceProof = () => (
    <div className={`flex flex-col items-center text-center ${isDesktop ? 'space-y-5' : 'space-y-4'}`}>
      {logoEl}
      {backButton}
      <h2 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`} style={{ color: titleColor }}>Comprovante de Residência</h2>
      <p className={isDesktop ? 'text-sm' : 'text-xs'} style={{ color: textColor }}>Tire uma foto de um comprovante recente</p>
      <div
        className={`w-full rounded-lg flex flex-col items-center justify-center gap-2 ${isDesktop ? 'h-36 max-w-md' : 'h-28'}`}
        style={{ border: `2px dashed ${iconColor}60` }}
      >
        <Camera className={isDesktop ? 'w-10 h-10' : 'w-8 h-8'} style={{ color: `${iconColor}80` }} />
        <span className={isDesktop ? 'text-xs' : 'text-[10px]'} style={{ color: `${textColor}80` }}>Toque para capturar</span>
      </div>
      {actionButton('Capturar Comprovante', 'preview-button-residence', next)}
    </div>
  );

  const renderCongratulations = () => (
    <div className={`flex flex-col items-center text-center py-6 ${isDesktop ? 'space-y-5' : 'space-y-4'}`}>
      {logoEl}
      <CheckCircle className={isDesktop ? 'w-20 h-20' : 'w-16 h-16'} style={{ color: buttonColor }} />
      <h2 className={`font-bold ${isDesktop ? 'text-2xl' : 'text-lg'}`} style={{ color: titleColor }}>Parabéns!</h2>
      <p className={isDesktop ? 'text-sm' : 'text-xs'} style={{ color: textColor }}>Processo concluído com sucesso</p>
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

  const desktopLogoHeader = isDesktop && logoUrl ? (
    <div className="flex items-center px-6 py-3" style={{ borderBottom: `1px solid ${iconColor}15` }}>
      <img
        src={logoUrl}
        alt="Logo"
        style={{ height: 36, objectFit: 'contain' as const }}
      />
    </div>
  ) : null;

  const viewToggle = (
    <div className="flex items-center justify-center gap-1 mb-3">
      <button
        onClick={() => setViewMode('mobile')}
        data-testid="button-view-mobile"
        className="flex items-center gap-1 px-3 py-1.5 rounded-l-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: viewMode === 'mobile' ? buttonColor : 'transparent',
          color: viewMode === 'mobile' ? buttonTextColor : undefined,
          border: `1px solid ${viewMode === 'mobile' ? buttonColor : 'hsl(var(--border))'}`,
        }}
      >
        <Smartphone className="w-3.5 h-3.5" />
        Mobile
      </button>
      <button
        onClick={() => setViewMode('desktop')}
        data-testid="button-view-desktop"
        className="flex items-center gap-1 px-3 py-1.5 rounded-r-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: viewMode === 'desktop' ? buttonColor : 'transparent',
          color: viewMode === 'desktop' ? buttonTextColor : undefined,
          border: `1px solid ${viewMode === 'desktop' ? buttonColor : 'hsl(var(--border))'}`,
        }}
      >
        <Monitor className="w-3.5 h-3.5" />
        Desktop
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <div>
        {viewToggle}
        <div
          className="rounded-lg border-2 border-foreground/20 overflow-hidden shadow-xl"
          data-testid="signature-flow-preview-desktop"
        >
          <div className="bg-foreground/10 h-8 flex items-center gap-2 px-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-foreground/10 rounded-md px-3 py-0.5 text-[9px] text-muted-foreground max-w-[180px] truncate">
                app.seudominio.com/assinatura
              </div>
            </div>
          </div>
          {desktopLogoHeader}
          <div
            style={{
              backgroundColor,
              minHeight: 400,
              fontFamily: 'Arial, sans-serif',
              transition: 'opacity 150ms ease',
              opacity: transitioning ? 0 : 1,
            }}
          >
            {renderStepDots()}
            <div className="px-8 pb-6 flex flex-col items-center">
              {steps[currentStep]()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {viewToggle}
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
    </div>
  );
}
