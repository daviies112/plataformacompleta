import { useState } from "react";
import { User, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CPFInputProps {
  onSubmit: (cpf: string) => void;
  onBack: () => void;
}

export function CPFInput({ onSubmit, onBack }: CPFInputProps) {
  const [cpf, setCpf] = useState("");
  const [isValid, setIsValid] = useState(false);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    
    if (numbers.length <= 11) {
      const formatted = numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2");
      
      setCpf(formatted);
      
      // Validação simples de CPF (11 dígitos)
      setIsValid(numbers.length === 11);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(cpf.replace(/\D/g, ""));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-title">
          Digite seu CPF
        </h2>
        <p className="text-sm text-muted-foreground">
          Informe o CPF do titular da conta bancária
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="cpf" className="text-sm font-medium">
            CPF
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => formatCPF(e.target.value)}
              className="pl-10 h-12 text-base"
              autoFocus
              data-testid="input-cpf"
            />
            {isValid && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-chart-2" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Digite apenas números, a formatação é automática
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12"
            data-testid="button-back"
          >
            Voltar
          </Button>
          <Button
            type="submit"
            disabled={!isValid}
            className="flex-1 h-12"
            data-testid="button-continue"
          >
            Continuar
          </Button>
        </div>
      </form>
    </div>
  );
}
