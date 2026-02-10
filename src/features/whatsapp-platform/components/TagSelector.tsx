import { useState } from "react";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { configManager } from "../lib/config";
import { toast } from "sonner";

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function TagSelector({ 
  selectedTagIds, 
  onTagsChange,
  variant = 'outline',
  size = 'sm'
}: TagSelectorProps) {
  const tags = configManager.getTags();
  const [open, setOpen] = useState(false);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
      toast.info("Etiqueta removida");
    } else {
      onTagsChange([...selectedTagIds, tagId]);
      toast.success("Etiqueta adicionada");
    }
  };

  const selectedCount = selectedTagIds.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <TagIcon className="h-4 w-4" />
          {selectedCount > 0 ? `${selectedCount} etiqueta${selectedCount > 1 ? 's' : ''}` : 'Adicionar etiqueta'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Selecione as etiquetas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tags.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            <p>Nenhuma etiqueta criada.</p>
            <p className="mt-2">Crie etiquetas em Configurações</p>
          </div>
        ) : (
          tags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className="w-4 h-4 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1">{tag.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
