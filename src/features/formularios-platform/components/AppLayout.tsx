import { ReactNode } from "react";
import { HorizontalNav } from "./HorizontalNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-background via-background to-primary/5">
      <HorizontalNav />
      <main className="flex-1 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
