import { Plus } from "lucide-react";
import { Button } from "@/features/produto/components/ui/button";

interface FABProps {
  onClick: () => void;
  label?: string;
}

export const FAB = ({ onClick, label = "Adicionar" }: FABProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-20 right-4 h-14 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 z-40 safe-area-bottom"
      size="lg"
      data-testid="fab-add"
    >
      <Plus className="w-6 h-6 mr-2" />
      {label}
    </Button>
  );
};
