import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorPicker } from "@/components/design/ColorPicker";
import { configManager, WhatsAppTag } from "../lib/config";
import { toast } from "sonner";

export const TagManager = () => {
  const [tags, setTags] = useState<WhatsAppTag[]>(configManager.getTags());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("hsl(210, 100%, 50%)");

  const handleAddTag = () => {
    if (!newName.trim()) {
      toast.error("Digite um nome para a etiqueta");
      return;
    }

    const tag = configManager.addTag(newName.trim(), newColor);
    setTags(configManager.getTags());
    setNewName("");
    setNewColor("hsl(210, 100%, 50%)");
    setIsAdding(false);
    toast.success("Etiqueta adicionada com sucesso!");
  };

  const startEdit = (tag: WhatsAppTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast.error("Digite um nome para a etiqueta");
      return;
    }

    configManager.updateTag(editingId!, editName.trim(), editColor);
    setTags(configManager.getTags());
    setEditingId(null);
    toast.success("Etiqueta atualizada!");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja deletar esta etiqueta?")) {
      configManager.deleteTag(id);
      setTags(configManager.getTags());
      toast.success("Etiqueta removida!");
    }
  };

  const handleReset = () => {
    if (window.confirm("Resetar todas as etiquetas para o padrão? Esta ação não pode ser desfeita.")) {
      configManager.resetTags();
      setTags(configManager.getTags());
      setIsAdding(false);
      setEditingId(null);
      toast.success("Etiquetas resetadas para o padrão!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Etiquetas Personalizadas</CardTitle>
            <CardDescription>
              Gerencie as etiquetas para organizar suas conversas
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de etiquetas existentes */}
        <div className="space-y-3">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              {editingId === tag.id ? (
                <>
                  {/* Modo de edição */}
                  <div className="flex-1 space-y-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome da etiqueta"
                      className="font-medium"
                    />
                    <ColorPicker
                      label="Cor da etiqueta"
                      color={editColor}
                      onChange={setEditColor}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="default"
                      onClick={handleSaveEdit}
                      className="h-8 w-8"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Modo de visualização */}
                  <div
                    className="w-6 h-6 rounded-full border-2 border-border shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{tag.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{tag.color}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(tag)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(tag.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Formulário para adicionar nova etiqueta */}
        {isAdding ? (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da nova etiqueta"
              className="font-medium"
            />
            <ColorPicker
              label="Cor da etiqueta"
              color={newColor}
              onChange={setNewColor}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddTag} className="gap-2">
                <Check className="h-4 w-4" />
                Adicionar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                  setNewColor("hsl(210, 100%, 50%)");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Nova Etiqueta
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
