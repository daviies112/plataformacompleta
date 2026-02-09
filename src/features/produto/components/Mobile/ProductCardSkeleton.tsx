import { Card } from "@/features/produto/components/ui/card";
import { Skeleton } from "@/features/produto/components/ui/skeleton";

export const ProductCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export const ProductListSkeleton = () => {
  return (
    <div className="px-4 space-y-3 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};
