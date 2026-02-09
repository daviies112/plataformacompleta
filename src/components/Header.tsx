import { Wallet } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Faturamento</h1>
        </div>
      </div>
    </header>
  );
}
