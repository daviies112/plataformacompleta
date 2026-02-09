import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { memo } from 'react';

export interface CPFComplianceData {
  status: 'approved' | 'rejected' | 'manual_review' | 'error' | 'pending' | string;
  riskScore: number;
  hasCheck: boolean;
  consultedAt?: string;
  totalLawsuits?: number;
  hasActiveCollections?: boolean;
  taxIdStatus?: string;
  personName?: string;
}

interface CPFComplianceBadgeProps {
  compliance?: CPFComplianceData;
  loading?: boolean;
  className?: string;
}

export const CPFComplianceBadge = memo(function CPFComplianceBadge({
  compliance,
  loading = false,
  className = ''
}: CPFComplianceBadgeProps) {
  
  if (loading) {
    return (
      <Badge variant="outline" className={`${className} animate-pulse`}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        CPF...
      </Badge>
    );
  }

  if (!compliance || !compliance.hasCheck) {
    return null;
  }

  const getStatusConfig = () => {
    const { status, riskScore, totalLawsuits, hasActiveCollections, taxIdStatus } = compliance;

    switch (status) {
      case 'approved':
        return {
          icon: ShieldCheck,
          label: 'CPF Aprovado',
          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          iconColor: 'text-emerald-400',
          tooltip: `CPF Regular${taxIdStatus ? ` - ${taxIdStatus}` : ''}`
        };
      
      case 'rejected':
        return {
          icon: ShieldX,
          label: 'CPF Reprovado',
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
          iconColor: 'text-red-400',
          tooltip: `Score: ${riskScore.toFixed(1)} - ${totalLawsuits || 0} processo(s)${hasActiveCollections ? ' + cobranças ativas' : ''}`
        };
      
      case 'manual_review':
        return {
          icon: AlertTriangle,
          label: 'Análise',
          color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          iconColor: 'text-amber-400',
          tooltip: `Requer análise manual - Score: ${riskScore.toFixed(1)}${totalLawsuits ? ` - ${totalLawsuits} processo(s)` : ''}`
        };
      
      case 'error':
        return {
          icon: ShieldAlert,
          label: 'Erro CPF',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          iconColor: 'text-gray-400',
          tooltip: 'Erro na consulta do CPF'
        };
      
      case 'pending':
        return {
          icon: Shield,
          label: 'Pendente',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          iconColor: 'text-blue-400',
          tooltip: 'Consulta de CPF pendente'
        };
      
      default:
        return {
          icon: Shield,
          label: 'CPF',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          iconColor: 'text-gray-400',
          tooltip: `Status: ${status}`
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={`${config.color} ${className} flex items-center gap-1 text-[10px] px-1.5 py-0.5 font-medium cursor-help`}
          >
            <Icon className={`w-3 h-3 ${config.iconColor}`} />
            <span>{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs">
            <p className="font-medium">{config.tooltip}</p>
            {compliance.personName && (
              <p className="text-muted-foreground mt-1">Nome: {compliance.personName}</p>
            )}
            {compliance.consultedAt && (
              <p className="text-muted-foreground">
                Consultado: {new Date(compliance.consultedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
