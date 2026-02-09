import { Package, MoreVertical, Printer } from "lucide-react";
import { Card } from "@/features/produto/components/ui/card";
import { Badge } from "@/features/produto/components/ui/badge";
import { Button } from "@/features/produto/components/ui/button";
import type { Product } from "@/pages/Index";

interface ProductCardProps {
  product: Product;
  onSelect?: (id: string) => void;
  onPrint?: (product: Product) => void;
  isSelected?: boolean;
}

export const ProductCard = ({ product, onSelect, onPrint, isSelected }: ProductCardProps) => {
  return (
    <Card 
      className={`overflow-hidden transition-all active:scale-[0.98] ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onSelect?.(product.id)}
      data-testid={`card-product-${product.id}`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={product.image}
              alt={product.description}
              className="w-full h-full object-cover"
              data-testid={`img-product-${product.id}`}
            />
          </div>
          {product.stock > 0 && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1"
              data-testid={`badge-stock-${product.id}`}
            >
              {product.stock}
            </Badge>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight" data-testid={`text-product-name-${product.id}`}>
              {product.description}
            </h3>
            <div className="flex gap-1 -mt-1 -mr-1">
              {onPrint && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrint(product);
                  }}
                  data-testid={`button-print-${product.id}`}
                >
                  <Printer className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                data-testid={`button-menu-${product.id}`}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono" data-testid={`text-barcode-${product.id}`}>
            {product.barcode}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs" data-testid={`badge-category-${product.id}`}>
                {product.category}
              </Badge>
            </div>
            <p className="text-lg font-bold text-primary" data-testid={`text-price-${product.id}`}>
              {product.price}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
