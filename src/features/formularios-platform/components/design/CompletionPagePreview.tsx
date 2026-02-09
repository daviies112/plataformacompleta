import { useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle2, XCircle, Award, Star, Heart, Trophy, Sparkles, ThumbsUp, PartyPopper } from "lucide-react";
import { CompletionPageConfig } from "../../types/form";

interface CompletionPagePreviewProps {
  config: CompletionPageConfig;
  passed?: boolean;
  score?: number;
  tier?: string;
  previewMode?: 'success' | 'failure';
}

export const CompletionPagePreview = ({ 
  config, 
  passed: passedProp, 
  score: scoreProp, 
  tier,
  previewMode 
}: CompletionPagePreviewProps) => {
  // If previewMode is provided, use it to determine passed state
  const passed = previewMode ? previewMode === 'success' : (passedProp ?? true);
  const score = scoreProp ?? 85; // Default score for preview
  
  // Use design from config with default values
  const design = config.design || {
    colors: {
      primary: "hsl(221, 83%, 53%)",
      secondary: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      text: "hsl(222, 47%, 11%)",
      successIcon: "hsl(142, 71%, 45%)",
      failureIcon: "hsl(0, 84%, 60%)"
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "3xl",
      textSize: "base"
    },
    spacing: "comfortable" as const
  };

  const renderIcon = () => {
    const iconColor = passed ? design.colors.successIcon : design.colors.failureIcon;
    const IconComponent = passed ? CheckCircle2 : XCircle;
    
    return <IconComponent className="h-10 w-10" style={{ color: iconColor }} />;
  };

  const spacingClasses = {
    compact: "space-y-4",
    comfortable: "space-y-6",
    spacious: "space-y-8"
  };

  const titleSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl"
  };

  // Load Google Fonts
  useEffect(() => {
    if (design.typography.fontFamily && design.typography.fontFamily !== "Inter") {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${design.typography.fontFamily.replace(' ', '+')}:wght@400;500;600;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [design.typography.fontFamily]);

  return (
    <div className="max-w-2xl mx-auto" style={{ fontFamily: design.typography.fontFamily }}>
      <Card
        className={`p-8 shadow-[var(--shadow-luxury)] ${spacingClasses[design.spacing]}`}
        style={{ 
          backgroundColor: design.colors.background,
          color: design.colors.text,
          borderColor: design.colors.primary
        }}
      >
        {design.logo && (
          <div className={`mb-8 ${design.logoAlign === 'center' ? 'flex justify-center' : design.logoAlign === 'right' ? 'flex justify-end' : ''}`}>
            <img src={design.logo} alt="Logo" className="h-16 object-contain" />
          </div>
        )}

        <div className="text-center space-y-6">
          <div className={`inline-flex items-center justify-center ${
            (passed ? config.successIconImage : config.failureIconImage) 
              ? '' 
              : `w-20 h-20 rounded-full ${passed ? 'bg-green-500/20' : 'bg-destructive/20'}`
          }`}>
            {renderIcon()}
          </div>

          <div>
            <h2 
              className={`${titleSizeClasses[design.typography.titleSize as keyof typeof titleSizeClasses]} font-bold mb-2`}
              style={{ color: design.colors.text }}
            >
              {config.title}
            </h2>
            {config.subtitle && (
              <p 
                className={`${textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]} opacity-70`}
                style={{ color: design.colors.text }}
              >
                {config.subtitle}
              </p>
            )}
          </div>

          {config.showTierBadge && tier && passed && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-4 border rounded-lg"
                style={{ 
                  backgroundColor: `${design.colors.primary}10`,
                  borderColor: `${design.colors.primary}20`
                }}
              >
                <Award className="h-6 w-6" style={{ color: design.colors.primary }} />
                <div className="text-left">
                  <div className="font-bold text-lg" style={{ color: design.colors.primary }}>
                    {tier}
                  </div>
                  <div className="text-sm opacity-70" style={{ color: design.colors.text }}>
                    Lead altamente qualificado
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.showScore && (
            <div className="flex items-center justify-center gap-8 py-6 border-y"
              style={{ borderColor: `${design.colors.primary}30` }}
            >
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {score}
                </div>
                <div className="text-sm opacity-70" style={{ color: design.colors.text }}>pontos</div>
              </div>
            </div>
          )}

          <p 
            className={`${textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]}`}
            style={{ color: design.colors.text }}
          >
            {passed ? config.successMessage : config.failureMessage}
          </p>

          {config.customContent && (
            <div 
              className="p-4 border rounded-lg text-sm"
              dangerouslySetInnerHTML={{ __html: config.customContent }}
              style={{ 
                backgroundColor: design.colors.secondary,
                borderColor: `${design.colors.primary}20`,
                color: design.colors.text 
              }}
            />
          )}

          {passed && !config.ctaText && (
            <div className="p-4 border rounded-lg"
              style={{ 
                backgroundColor: `${design.colors.primary}10`,
                borderColor: `${design.colors.primary}20`
              }}
            >
              <p className="text-sm" style={{ color: design.colors.text }}>
                Em breve, nossa equipe entrará em contato para agendar sua reunião.
              </p>
            </div>
          )}

          {config.ctaText && config.ctaUrl && (
            <div className="pt-4">
              <Button
                className="w-full gap-2 py-6 text-base"
                style={{
                  backgroundColor: design.colors.primary,
                  color: design.colors.background
                }}
              >
                {config.ctaText}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
