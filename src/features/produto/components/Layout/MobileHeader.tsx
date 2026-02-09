import { Search, Menu, Settings, Bell } from "lucide-react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { useState } from "react";

interface MobileHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showSearch?: boolean;
}

export const MobileHeader = ({ title, onMenuClick, showSearch = false }: MobileHeaderProps) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40">
      <div className="px-4 h-14 flex items-center justify-between gap-3">
        {!searchOpen ? (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate" data-testid="header-title">
                  {title}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {showSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setSearchOpen(true)}
                  data-testid="button-search"
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                data-testid="button-notifications"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={onMenuClick}
                data-testid="button-menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <Input
              type="search"
              placeholder="Buscar produtos..."
              className="flex-1 h-10"
              autoFocus
              data-testid="input-search"
            />
            <Button
              variant="ghost"
              onClick={() => setSearchOpen(false)}
              data-testid="button-cancel-search"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
