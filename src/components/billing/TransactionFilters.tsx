import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { translateCategory } from "@/lib/translations";

export interface TransactionFilterParams {
  searchText: string;
  dateFrom: string;
  dateTo: string;
  type: string; // "all" | "DEBIT" | "CREDIT"
  category: string;
}

interface TransactionFiltersProps {
  onFilterChange: (filters: TransactionFilterParams) => void;
  availableCategories: string[];
}

export default function TransactionFilters({ onFilterChange, availableCategories }: TransactionFiltersProps) {
  const [filters, setFilters] = useState<TransactionFilterParams>({
    searchText: "",
    dateFrom: "",
    dateTo: "",
    type: "all",
    category: "all",
  });

  const handleFilterChange = (key: keyof TransactionFilterParams, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: TransactionFilterParams = {
      searchText: "",
      dateFrom: "",
      dateTo: "",
      type: "all",
      category: "all",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = 
    filters.searchText !== "" || 
    filters.dateFrom !== "" || 
    filters.dateTo !== "" || 
    filters.type !== "all" || 
    filters.category !== "all";

  return (
    <Card className="p-6 mb-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Filtros de Transações</h3>
          </div>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Busca por Nome/Descrição */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar por Nome/Descrição</Label>
            <Input
              id="search"
              placeholder="Ex: Mercadolivre, Pagamento..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
            />
          </div>

          {/* Data Inicial */}
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Data Inicial</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />
          </div>

          {/* Data Final */}
          <div className="space-y-2">
            <Label htmlFor="dateTo">Data Final</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />
          </div>

          {/* Tipo (Débito/Crédito) */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange("type", value)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DEBIT">Débito</SelectItem>
                <SelectItem value="CREDIT">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange("category", value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {translateCategory(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}
