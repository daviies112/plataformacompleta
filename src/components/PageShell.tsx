import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import HeaderNavigation from "./HeaderNavigation";
import { MobileHeader } from "./mobile/MobileHeader";
import { BottomNav } from "./mobile/BottomNav";

interface PageShellProps {
  children: React.ReactNode;
}

const PageShell = ({ children }: PageShellProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-background">
        <MobileHeader />
        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))]" style={{ marginTop: '40px' }}>
          {children}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <HeaderNavigation />
      <main className="pt-12">
        {children}
      </main>
    </div>
  );
};

export default PageShell;