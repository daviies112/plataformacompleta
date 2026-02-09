import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useCpfValidation } from "@/hooks/use-cpf-validation";
import { Search, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface CpfFormProps {
  onSubmit: (data: { cpf: string; name: string; forceRefresh?: boolean }) => void;
  isLoading?: boolean;
}

export function CpfForm({ onSubmit, isLoading }: CpfFormProps) {
  const cpf = useCpfValidation();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!name.trim()) {
      setNameError("Nome é obrigatório");
      return;
    }
    if (name.trim().length < 3) {
      setNameError("Nome deve ter no mínimo 3 caracteres");
      return;
    }
    setNameError("");

    if (cpf.validate()) {
      onSubmit({ cpf: cpf.getNormalizedValue(), name: name.trim(), forceRefresh });
    }
  };

  return (
    <Card data-testid="cpf-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Nova Consulta CPF
        </CardTitle>
        <CardDescription>
          Consulte processos judiciais via Bigdatacorp com cache inteligente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="relative">
              <Input
                id="name"
                type="text"
                placeholder="Nome completo da pessoa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={nameError && submitted ? "border-destructive" : ""}
                disabled={isLoading}
                data-testid="input-name"
                autoComplete="off"
              />
              {name.trim().length >= 3 && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-accent" />
              )}
            </div>
            {nameError && submitted && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{nameError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <div className="relative">
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf.value}
                onChange={(e) => cpf.handleChange(e.target.value)}
                className={`font-mono ${cpf.error && submitted ? "border-destructive" : ""}`}
                disabled={isLoading}
                data-testid="input-cpf"
                autoComplete="off"
              />
              {cpf.isValid && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-accent" />
              )}
            </div>
            {cpf.error && submitted && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{cpf.error}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground" data-testid="cpf-security-notice">
              🔒 CPF criptografado com SHA-256 + AES-256 (conformidade LGPD)
            </p>
          </div>

          <div className="flex items-center space-x-2 p-3 rounded-lg border border-orange-200 bg-orange-50">
            <Checkbox
              id="forceRefresh"
              checked={forceRefresh}
              onCheckedChange={(checked) => setForceRefresh(checked === true)}
              disabled={isLoading}
            />
            <div className="flex flex-col">
              <Label htmlFor="forceRefresh" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-orange-600" />
                Forçar Atualização (3 APIs DataCorp)
              </Label>
              <p className="text-xs text-muted-foreground">
                Ignora cache e busca dados frescos: Dados Cadastrais + Processos Financeiros + Processos Judiciais (custo: ~R$ 0,17)
              </p>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || (submitted && (!cpf.isValid || !name.trim()))}
            data-testid="button-submit-cpf"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Consultar Processos
              </>
            )}
          </Button>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <h4 className="text-sm font-medium">Como funciona:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">1.</span>
                <span>Busca no cache local (economia de custos se já consultado)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">2.</span>
                <span>Se não encontrado, consulta API Bigdatacorp (R$ 0,07)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">3.</span>
                <span>Análise automática de risco jurídico (score 0-10)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">4.</span>
                <span>Resultado armazenado em cache por 60 dias</span>
              </li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
