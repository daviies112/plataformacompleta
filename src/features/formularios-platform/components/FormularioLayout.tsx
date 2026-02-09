import { ReactNode } from "react";
import { HorizontalNav } from "./HorizontalNav";

interface FormularioLayoutProps {
  children: ReactNode;
}

export function FormularioLayout({ children }: FormularioLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col w-full bg-gradient-to-br from-background via-background to-primary/5">
      <HorizontalNav />
      <main className="flex-1 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
