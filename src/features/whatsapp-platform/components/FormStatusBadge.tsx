import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useLeadStatus } from '../contexts/LeadStatusContext';

interface FormStatusBadgeProps {
  telefone: string;
  className?: string;
  formStatus?: string;
  qualificationStatus?: string;
  pontuacao?: number;
}

export function FormStatusBadge({ 
  telefone, 
  className = '',
  formStatus: propFormStatus,
  qualificationStatus: propQualificationStatus,
  pontuacao: propPontuacao
}: FormStatusBadgeProps) {
  const { getStatus, loadStatuses, labels } = useLeadStatus();
  const [initialLoading, setInitialLoading] = useState(false);

  const hasPropsData = propFormStatus !== undefined;

  useEffect(() => {
    if (!hasPropsData && telefone) {
      setInitialLoading(true);
      loadStatuses([telefone]).then(() => {
        setInitialLoading(false);
      });
    }
  }, [telefone, hasPropsData, loadStatuses]);

  const status = hasPropsData ? null : getStatus(telefone);
  
  const formStatus = propFormStatus || status?.lead?.formStatus || 'not_sent';
  const qualificationStatus = propQualificationStatus || status?.lead?.qualificationStatus;
  const pontuacao = propPontuacao !== undefined ? propPontuacao : status?.lead?.pontuacao;

  if (initialLoading && !hasPropsData && !status) {
    return (
      <Badge variant="outline" className={`${className} animate-pulse`}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Carregando...
      </Badge>
    );
  }

  const getContrastColor = (hslColor: string): string => {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return '#ffffff';
    
    const lightness = parseInt(match[3]);
    return lightness < 60 ? '#ffffff' : '#000000';
  };

  const getBadgeConfig = () => {
    if (!Array.isArray(labels) || labels.length === 0) {
      return {
        variant: 'outline' as const,
        className: 'border-0 font-medium',
        style: {
          backgroundColor: 'hsl(0, 0%, 70%)',
          color: '#ffffff',
          borderColor: 'hsl(0, 0%, 70%)',
        },
        text: 'Status indefinido'
      };
    }

    const matchingLabel = labels.find(label => {
      if (label.formStatus !== formStatus) return false;
      if (label.qualificationStatus === null) return true;
      return label.qualificationStatus === qualificationStatus;
    });

    if (matchingLabel) {
      const showPoints = pontuacao !== null && pontuacao !== undefined && qualificationStatus !== 'pending';
      return {
        variant: 'outline' as const,
        className: 'border-0 font-medium',
        style: {
          backgroundColor: matchingLabel.cor,
          color: getContrastColor(matchingLabel.cor),
          borderColor: matchingLabel.cor,
        },
        text: matchingLabel.nome + (showPoints ? ` (${pontuacao}pts)` : '')
      };
    }

    return {
      variant: 'outline' as const,
      className: 'border-0 font-medium',
      style: {
        backgroundColor: 'hsl(0, 0%, 70%)',
        color: '#ffffff',
        borderColor: 'hsl(0, 0%, 70%)',
      },
      text: 'Status indefinido'
    };
  };

  const config = getBadgeConfig();

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className} flex items-center gap-1`}
      style={config.style}
    >
      <span>{config.text}</span>
    </Badge>
  );
}
