import { useState, useMemo } from "react";
import { ResellerCard } from "./ResellerCard";
import { FAB } from "./FAB";
import { Input } from "@/features/produto/components/ui/input";
import { Button } from "@/features/produto/components/ui/button";
import { Filter, Download, Upload, Users, Calendar as CalendarIcon } from "lucide-react";
import type { Reseller } from "@/pages/Index";
import { Badge } from "@/features/produto/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import { Calendar } from "@/features/produto/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/produto/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/features/produto/lib/utils";
import { ScrollArea } from "@/features/produto/components/ui/scroll-area";

interface MobileResellerListProps {
  resellers: Reseller[];
  onAddReseller: () => void;
  onImportResellers: (resellers: Reseller[]) => void;
  onEdit?: (reseller: Reseller) => void;
}

export const MobileResellerList = ({
  resellers,
  onAddReseller,
  onImportResellers,
  onEdit,
}: MobileResellerListProps) => {
  const [selectedResellers, setSelectedResellers] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    tipo: "",
    nivel: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const filteredResellers = useMemo(() => {
    return resellers.filter((reseller) => {
      const matchNome = !filters.nome || reseller.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchCpf = !filters.cpf || reseller.cpf.includes(filters.cpf);
      const matchTelefone = !filters.telefone || reseller.telefone.includes(filters.telefone);
      const matchEmail = !filters.email || reseller.email.toLowerCase().includes(filters.email.toLowerCase());
      const matchTipo = !filters.tipo || reseller.tipo.toLowerCase().includes(filters.tipo.toLowerCase());
      const matchNivel = !filters.nivel || reseller.nivel.toLowerCase().includes(filters.nivel.toLowerCase());

      // Date filtering (assuming resellers have a createdAt or similar date field)
      // If you need to filter by a specific date field, adjust accordingly
      const matchStartDate = !filters.startDate;
      const matchEndDate = !filters.endDate;

      return matchNome && matchCpf && matchTelefone && matchEmail && matchTipo && matchNivel && matchStartDate && matchEndDate;
    });
  }, [resellers, filters]);

  const activeFiltersCount = 
    (filters.nome ? 1 : 0) +
    (filters.cpf ? 1 : 0) +
    (filters.telefone ? 1 : 0) +
    (filters.email ? 1 : 0) +
    (filters.tipo ? 1 : 0) +
    (filters.nivel ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  const handleSelectReseller = (id: string) => {
    setSelectedResellers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Actions Bar */}
      <div className="sticky top-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 z-30">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-shrink-0" data-testid="button-import">
            <Upload className="w-4 h-4 mr-1" />
            Importar
          </Button>
          <Button variant="outline" size="sm" className="flex-shrink-0" data-testid="button-export">
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
          
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0 relative" data-testid="button-filter">
                <Filter className="w-4 h-4 mr-1" />
                Filtro
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(85vh-120px)] mt-4">
                <div className="space-y-4 pr-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      placeholder="Buscar por nome..."
                      value={filters.nome}
                      onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
                      data-testid="input-filter-nome"
                    />
                  </div>
                  
                  <div>
                    <Label>CPF</Label>
                    <Input
                      placeholder="Buscar por CPF..."
                      value={filters.cpf}
                      onChange={(e) => setFilters({ ...filters, cpf: e.target.value })}
                      data-testid="input-filter-cpf"
                    />
                  </div>
                  
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      placeholder="Buscar por telefone..."
                      value={filters.telefone}
                      onChange={(e) => setFilters({ ...filters, telefone: e.target.value })}
                      data-testid="input-filter-telefone"
                    />
                  </div>
                  
                  <div>
                    <Label>Email</Label>
                    <Input
                      placeholder="Buscar por email..."
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                      data-testid="input-filter-email"
                    />
                  </div>
                  
                  <div>
                    <Label>Tipo</Label>
                    <Input
                      placeholder="Ex: Gold, Silver, Bronze..."
                      value={filters.tipo}
                      onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                      data-testid="input-filter-tipo"
                    />
                  </div>
                  
                  <div>
                    <Label>Nível</Label>
                    <Input
                      placeholder="Ex: Nível 1, Nível 2..."
                      value={filters.nivel}
                      onChange={(e) => setFilters({ ...filters, nivel: e.target.value })}
                      data-testid="input-filter-nivel"
                    />
                  </div>
                  
                  <div>
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.startDate && "text-muted-foreground"
                          )}
                          data-testid="button-filter-startdate"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.startDate}
                          onSelect={(date) => setFilters({ ...filters, startDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.endDate && "text-muted-foreground"
                          )}
                          data-testid="button-filter-enddate"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.endDate}
                          onSelect={(date) => setFilters({ ...filters, endDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </ScrollArea>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setFilters({ 
                    nome: "", 
                    cpf: "", 
                    telefone: "", 
                    email: "", 
                    tipo: "", 
                    nivel: "",
                    startDate: undefined,
                    endDate: undefined
                  })}
                  data-testid="button-clear-filters"
                >
                  Limpar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setFilterOpen(false)}
                  data-testid="button-apply-filters"
                >
                  Aplicar
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-results-count">
          {filteredResellers.length} {filteredResellers.length === 1 ? "revendedor" : "revendedores"}
          {selectedResellers.length > 0 && ` · ${selectedResellers.length} selecionado(s)`}
        </p>
      </div>

      {/* Reseller List */}
      <div className="flex-1 overflow-auto px-4 space-y-3 py-3">
        {filteredResellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-resellers">
              Nenhum revendedor encontrado
            </p>
          </div>
        ) : (
          filteredResellers.map((reseller) => (
            <ResellerCard
              key={reseller.id}
              reseller={reseller}
              onSelect={handleSelectReseller}
              isSelected={selectedResellers.includes(reseller.id)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <FAB onClick={onAddReseller} label="Novo Revendedor" />
    </div>
  );
};
