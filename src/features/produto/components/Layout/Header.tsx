import { Search, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";

interface HeaderProps {
  title: string;
}

export const Header = ({ title }: HeaderProps) => {
  return (
    <header className="h-16 bg-primary border-b border-primary flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-xl font-semibold text-primary-foreground">{title}</h1>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <Input
            placeholder="Buscar..."
            className="pl-10 bg-white/10 border-white/20 text-primary-foreground placeholder:text-white/60 focus:bg-white/20"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground hover:bg-white/10"
          onClick={() => alert("Configurações")}
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary-foreground hover:bg-white/10"
          onClick={() => alert("Ajuda")}
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
