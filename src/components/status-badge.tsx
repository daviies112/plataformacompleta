import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import type { ComplianceStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
}

const statusConfig: Record<ComplianceStatus, {
  label: string;
  variant: "default" | "destructive" | "secondary" | "outline";
  icon: React.ElementType;
  className: string;
}> = {
  approved: {
    label: "Aprovado",
    variant: "default",
    icon: CheckCircle2,
    className: "bg-accent text-accent-foreground hover:bg-accent/90",
  },
  rejected: {
    label: "Rejeitado",
    variant: "destructive",
    icon: XCircle,
    className: "",
  },
  manual_review: {
    label: "Revisão Manual",
    variant: "secondary",
    icon: AlertCircle,
    className: "bg-chart-4/20 text-chart-4 hover:bg-chart-4/30 border-chart-4/40",
  },
  error: {
    label: "Erro",
    variant: "destructive",
    icon: XCircle,
    className: "",
  },
  pending: {
    label: "Pendente",
    variant: "outline",
    icon: Clock,
    className: "",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1 ${config.className} ${className || ""}`}
      data-testid={`status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
