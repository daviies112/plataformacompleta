import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import PluggyModal from "@/components/PluggyModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-8">
        {/* Header padronizado */}
        <div className="flex items-start gap-4 lg:gap-3">
          <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Wallet className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              Gestão Financeira
            </h1>
            <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1">
              Conecte suas contas bancárias e gerencie suas finanças
            </p>
          </div>
        </div>

        <div className="text-center space-y-12">
        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={() => setIsModalOpen(true)}
            className="gap-2 text-lg px-8 py-6"
          >
            <Wallet className="h-5 w-5" />
            Conectar Novo Banco
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">🔒 Seguro</h3>
            <p className="text-sm text-muted-foreground">
              Conexão criptografada com autenticação via QR Code
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">⚡ Rápido</h3>
            <p className="text-sm text-muted-foreground">
              Conecte seus bancos em poucos segundos
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="font-semibold mb-2">📊 Completo</h3>
            <p className="text-sm text-muted-foreground">
              Visualize contas, saldos e transações de todos seus bancos
            </p>
          </div>
        </div>
        </div>
      </div>

      <PluggyModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
