import { MoreVertical, Phone, Mail, Award } from "lucide-react";
import { Card } from "@/features/produto/components/ui/card";
import { Badge } from "@/features/produto/components/ui/badge";
import { Button } from "@/features/produto/components/ui/button";
import type { Reseller } from "@/pages/Index";

interface ResellerCardProps {
  reseller: Reseller;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export const ResellerCard = ({ reseller, onSelect, isSelected }: ResellerCardProps) => {
  return (
    <Card 
      className={`overflow-hidden transition-all active:scale-[0.98] ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onSelect?.(reseller.id)}
      data-testid={`card-reseller-${reseller.id}`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {reseller.nome.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 leading-tight" data-testid={`text-reseller-name-${reseller.id}`}>
              {reseller.nome}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 -mt-1 -mr-1"
              onClick={(e) => {
                e.stopPropagation();
              }}
              data-testid={`button-menu-${reseller.id}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono" data-testid={`text-cpf-${reseller.id}`}>
            CPF: {reseller.cpf}
          </p>
          
          <div className="flex flex-col gap-1 mb-2">
            {reseller.telefone && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <Phone className="w-3 h-3" />
                <span data-testid={`text-phone-${reseller.id}`}>{reseller.telefone}</span>
              </div>
            )}
            {reseller.email && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <Mail className="w-3 h-3" />
                <span className="truncate" data-testid={`text-email-${reseller.id}`}>{reseller.email}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400" 
                data-testid={`badge-status-${reseller.id}`}
              >
                ativo
              </Badge>
              {reseller.tipo && (
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  data-testid={`badge-tipo-${reseller.id}`}
                >
                  {reseller.tipo}
                </Badge>
              )}
            </div>
            {reseller.nivel && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <Award className="w-3 h-3" />
                <span data-testid={`text-nivel-${reseller.id}`}>{reseller.nivel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
