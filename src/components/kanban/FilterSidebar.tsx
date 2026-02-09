import { useState, useEffect } from 'react';
import { useFilters } from '@/contexts/FiltersContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, User, Clock, Tag, Activity } from 'lucide-react';
import { LabelColor } from '@/types/kanban';

interface FilterSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const labelColors: { color: LabelColor; name: string; bgClass: string }[] = [
  { color: 'green', name: 'Verde', bgClass: 'bg-green-500' },
  { color: 'yellow', name: 'Amarelo', bgClass: 'bg-yellow-500' },
  { color: 'orange', name: 'Laranja', bgClass: 'bg-orange-500' },
  { color: 'red', name: 'Vermelho', bgClass: 'bg-red-500' },
  { color: 'purple', name: 'Roxo', bgClass: 'bg-purple-500' },
  { color: 'blue', name: 'Azul', bgClass: 'bg-blue-500' },
  { color: 'sky', name: 'Céu', bgClass: 'bg-sky-500' },
  { color: 'lime', name: 'Lima', bgClass: 'bg-lime-500' },
  { color: 'pink', name: 'Rosa', bgClass: 'bg-pink-500' },
  { color: 'black', name: 'Preto', bgClass: 'bg-black' },
];

export function FilterSidebar({ open, onOpenChange }: FilterSidebarProps) {
  const {
    filters,
    setKeyword,
    toggleMemberNone,
    toggleMemberMe,
    toggleStatusCompleted,
    toggleStatusNotCompleted,
    toggleDueNone,
    toggleDueOverdue,
    toggleDueDay,
    toggleDueWeek,
    toggleDueMonth,
    toggleLabelNone,
    toggleLabelColor,
    toggleActivityNone,
    toggleActivityW1,
    toggleActivityW2,
    toggleActivityW4,
    toggleMode,
    toggleCollapseNonMatchingLists,
    clearAllFilters,
    hasActiveFilters,
  } = useFilters();

  const [localKeyword, setLocalKeyword] = useState(filters.keyword);

  useEffect(() => {
    setLocalKeyword(filters.keyword);
  }, [filters.keyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(localKeyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [localKeyword, setKeyword]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] overflow-y-auto" data-testid="filter-sidebar">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Filtro
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-filters"
            >
              <X className="w-4 h-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Palavra-chave</Label>
            <Input
              value={localKeyword}
              onChange={(e) => setLocalKeyword(e.target.value)}
              placeholder="Insira uma palavra-chave…"
              className="w-full"
              data-testid="input-keyword-filter"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pesquise cartões, membros, etiquetas e muito mais.
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Membros
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="member-none"
                  checked={filters.members.none}
                  onCheckedChange={toggleMemberNone}
                  data-testid="checkbox-member-none"
                />
                <label htmlFor="member-none" className="text-sm cursor-pointer">
                  Sem membros
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="member-me"
                  checked={filters.members.me}
                  onCheckedChange={toggleMemberMe}
                  data-testid="checkbox-member-me"
                />
                <label htmlFor="member-me" className="text-sm cursor-pointer">
                  Cartões atribuídos a mim
                </label>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3 block">Card status</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status-completed"
                  checked={filters.status.completed}
                  onCheckedChange={toggleStatusCompleted}
                  data-testid="checkbox-status-completed"
                />
                <label htmlFor="status-completed" className="text-sm cursor-pointer">
                  Marcado como concluído
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status-not-completed"
                  checked={filters.status.notCompleted}
                  onCheckedChange={toggleStatusNotCompleted}
                  data-testid="checkbox-status-not-completed"
                />
                <label htmlFor="status-not-completed" className="text-sm cursor-pointer">
                  Não marcado como concluído
                </label>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Data de entrega
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="due-none"
                  checked={filters.due.none}
                  onCheckedChange={toggleDueNone}
                  data-testid="checkbox-due-none"
                />
                <label htmlFor="due-none" className="text-sm cursor-pointer">
                  Sem datas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="due-overdue"
                  checked={filters.due.overdue}
                  onCheckedChange={toggleDueOverdue}
                  data-testid="checkbox-due-overdue"
                />
                <label htmlFor="due-overdue" className="text-sm cursor-pointer">
                  Em Atraso
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="due-day"
                  checked={filters.due.day}
                  onCheckedChange={toggleDueDay}
                  data-testid="checkbox-due-day"
                />
                <label htmlFor="due-day" className="text-sm cursor-pointer">
                  A ser entregue em um dia
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="due-week"
                  checked={filters.due.week}
                  onCheckedChange={toggleDueWeek}
                  data-testid="checkbox-due-week"
                />
                <label htmlFor="due-week" className="text-sm cursor-pointer">
                  A ser entregue em uma semana
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="due-month"
                  checked={filters.due.month}
                  onCheckedChange={toggleDueMonth}
                  data-testid="checkbox-due-month"
                />
                <label htmlFor="due-month" className="text-sm cursor-pointer">
                  A ser entregue em um mês
                </label>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Etiquetas
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="label-none"
                  checked={filters.labels.none}
                  onCheckedChange={toggleLabelNone}
                  data-testid="checkbox-label-none"
                />
                <label htmlFor="label-none" className="text-sm cursor-pointer">
                  Sem etiquetas
                </label>
              </div>
              <div className="mt-3 space-y-2">
                {labelColors.map(({ color, name, bgClass }) => (
                  <div key={color} className="flex items-center space-x-2">
                    <Checkbox
                      id={`label-${color}`}
                      checked={filters.labels.colors.includes(color)}
                      onCheckedChange={() => toggleLabelColor(color)}
                      data-testid={`checkbox-label-${color}`}
                    />
                    <label
                      htmlFor={`label-${color}`}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <div className={`w-8 h-4 rounded ${bgClass}`} />
                      {name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activity-w1"
                  checked={filters.activity.w1}
                  onCheckedChange={toggleActivityW1}
                  data-testid="checkbox-activity-w1"
                />
                <label htmlFor="activity-w1" className="text-sm cursor-pointer">
                  Ativo na semana passada
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activity-w2"
                  checked={filters.activity.w2}
                  onCheckedChange={toggleActivityW2}
                  data-testid="checkbox-activity-w2"
                />
                <label htmlFor="activity-w2" className="text-sm cursor-pointer">
                  Ativo nas últimas duas semanas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activity-w4"
                  checked={filters.activity.w4}
                  onCheckedChange={toggleActivityW4}
                  data-testid="checkbox-activity-w4"
                />
                <label htmlFor="activity-w4" className="text-sm cursor-pointer">
                  Ativo nas últimas quatro semanas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activity-none"
                  checked={filters.activity.none}
                  onCheckedChange={toggleActivityNone}
                  data-testid="checkbox-activity-none"
                />
                <label htmlFor="activity-none" className="text-sm cursor-pointer">
                  Sem atividade nas últimas quatro semanas
                </label>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="collapse-lists"
                checked={filters.collapseNonMatchingLists}
                onCheckedChange={toggleCollapseNonMatchingLists}
                data-testid="checkbox-collapse-lists"
              />
              <label htmlFor="collapse-lists" className="text-sm cursor-pointer">
                Recolher listas sem cartões correspondentes
              </label>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Modo de correspondência</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMode}
                data-testid="button-toggle-mode"
              >
                {filters.mode === 'AND' ? 'E (AND)' : 'OU (OR)'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filters.mode === 'AND' 
                ? 'Cartões devem atender todos os filtros selecionados'
                : 'Cartões podem atender qualquer um dos filtros selecionados'}
            </p>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              data-testid="button-clear-filters"
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
