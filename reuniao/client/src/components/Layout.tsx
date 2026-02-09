import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8 max-w-7xl">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
