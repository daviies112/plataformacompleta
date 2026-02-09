import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BRAZILIAN_BANKS, type Bank } from "@shared/schema";

interface BankSelectorProps {
  onSelectBank: (bank: Bank) => void;
  selectedBank?: Bank;
}

export function BankSelector({ onSelectBank, selectedBank }: BankSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBanks = BRAZILIAN_BANKS.filter((bank) =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-title">
          Selecione seu Banco
        </h2>
        <p className="text-sm text-muted-foreground">
          Escolha a instituição financeira que deseja conectar
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar banco..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
          data-testid="input-search-bank"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
        {filteredBanks.map((bank) => (
          <Card
            key={bank.id}
            className={`p-4 cursor-pointer transition-all hover-elevate active-elevate-2 ${
              selectedBank?.id === bank.id
                ? "ring-2 ring-primary border-primary"
                : ""
            }`}
            onClick={() => onSelectBank(bank)}
            data-testid={`card-bank-${bank.id}`}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium leading-tight">
                {bank.name}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
