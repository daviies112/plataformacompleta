import { MoreVertical, Tag, Package } from "lucide-react";
import { Card } from "@/features/produto/components/ui/card";
import { Badge } from "@/features/produto/components/ui/badge";
import { Button } from "@/features/produto/components/ui/button";
import type { Category } from "@/pages/Index";

interface CategoryCardProps {
  category: Category;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export const CategoryCard = ({ category, onSelect, isSelected }: CategoryCardProps) => {
  return (
    <Card 
      className={`overflow-hidden transition-all active:scale-[0.98] ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onSelect?.(category.id)}
      data-testid={`card-category-${category.id}`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Tag className="w-6 h-6 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 leading-tight" data-testid={`text-category-name-${category.id}`}>
              {category.nome}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 -mt-1 -mr-1"
              onClick={(e) => {
                e.stopPropagation();
              }}
              data-testid={`button-menu-${category.id}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2" data-testid={`text-etiqueta-${category.id}`}>
            {category.etiqueta}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Package className="w-3 h-3" />
              <span data-testid={`text-produtos-${category.id}`}>
                {category.produtosVinculados} {category.produtosVinculados === 1 ? "produto" : "produtos"}
              </span>
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs"
              data-testid={`badge-custom-${category.id}`}
            >
              {category.etiquetaCustomizada}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};
