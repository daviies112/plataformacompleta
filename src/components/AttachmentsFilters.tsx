import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOptions {
  searchText: string;
  type: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  amountFrom: string;
  amountTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AttachmentsFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  categories: string[];
}

export default function AttachmentsFilters({ 
  filters, 
  onFiltersChange,
  categories 
}: AttachmentsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchText: '',
      type: 'all',
      category: 'all',
      dateFrom: '',
      dateTo: '',
      amountFrom: '',
      amountTo: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = 
    filters.searchText !== '' ||
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.amountFrom !== '' ||
    filters.amountTo !== '';

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Filtros</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              Ativos
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Busca por texto (sempre visível) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar por descrição ou estabelecimento..."
          value={filters.searchText}
          onChange={(e) => handleFilterChange('searchText', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
          {/* Tipo de Arquivo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Arquivo</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="receipt">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categoria</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ordenação */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ordenar por</Label>
            <div className="flex gap-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="amount">Valor</SelectItem>
                  <SelectItem value="category">Categoria</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  handleFilterChange(
                    'sortOrder',
                    filters.sortOrder === 'asc' ? 'desc' : 'asc'
                  )
                }
              >
                {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Data Inicial */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Inicial</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          {/* Data Final */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Final</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* Valor Mínimo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Valor Mínimo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={filters.amountFrom}
              onChange={(e) => handleFilterChange('amountFrom', e.target.value)}
            />
          </div>

          {/* Valor Máximo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Valor Máximo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={filters.amountTo}
              onChange={(e) => handleFilterChange('amountTo', e.target.value)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
