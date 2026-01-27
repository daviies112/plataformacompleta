import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Clock, Loader2, ArrowLeft, Video, Users, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Horario {
  id: string;
  tenant_id: string;
  dia_semana: number | null;
  horario: string;
  periodo: string;
  tipo_reuniao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const DIAS_SEMANA = [
  { value: 0, label: "Dom", nome: "Domingo" },
  { value: 1, label: "Seg", nome: "Segunda-feira" },
  { value: 2, label: "Ter", nome: "Terça-feira" },
  { value: 3, label: "Qua", nome: "Quarta-feira" },
  { value: 4, label: "Qui", nome: "Quinta-feira" },
  { value: 5, label: "Sex", nome: "Sexta-feira" },
  { value: 6, label: "Sáb", nome: "Sábado" },
];

const TIPOS_REUNIAO = [
  { value: "online", label: "Online", icon: Video },
  { value: "presencial", label: "Presencial", icon: MapPin },
  { value: "ambos", label: "Ambos", icon: Users },
];

export default function HorariosDisponiveis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHorario, setEditingHorario] = useState<Horario | null>(null);
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [todosDias, setTodosDias] = useState(false);
  const [horario, setHorario] = useState("09:00");
  const [tipoReuniao, setTipoReuniao] = useState("online");

  const { data: horarios = [], isLoading } = useQuery<Horario[]>({
    queryKey: ["/api/horarios"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/horarios", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/horarios"] });
      toast({ title: "Sucesso", description: "Horário(s) adicionado(s) com sucesso!" });
      closeModal();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao adicionar horário", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/horarios/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/horarios"] });
      toast({ title: "Sucesso", description: "Horário atualizado com sucesso!" });
      closeModal();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar horário", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/horarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/horarios"] });
      toast({ title: "Sucesso", description: "Horário removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao remover horário", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const response = await apiRequest("PATCH", `/api/horarios/${id}/toggle`, { ativo });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/horarios"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao alterar status", variant: "destructive" });
    },
  });

  const openAddModal = () => {
    setEditingHorario(null);
    setDiasSelecionados([]);
    setTodosDias(false);
    setHorario("09:00");
    setTipoReuniao("online");
    setIsModalOpen(true);
  };

  const openEditModal = (h: Horario) => {
    setEditingHorario(h);
    if (h.dia_semana === null) {
      setTodosDias(true);
      setDiasSelecionados([]);
    } else {
      setTodosDias(false);
      setDiasSelecionados([h.dia_semana]);
    }
    const timeValue = h.horario?.substring(0, 5) || "09:00";
    setHorario(timeValue);
    setTipoReuniao(h.tipo_reuniao || "online");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHorario(null);
  };

  const handleDiaChange = (dia: number, checked: boolean) => {
    if (checked) {
      setDiasSelecionados([...diasSelecionados, dia]);
    } else {
      setDiasSelecionados(diasSelecionados.filter((d) => d !== dia));
    }
    setTodosDias(false);
  };

  const handleTodosDiasChange = (checked: boolean) => {
    setTodosDias(checked);
    if (checked) {
      setDiasSelecionados([]);
    }
  };

  const handleSubmit = () => {
    if (!horario) {
      toast({ title: "Erro", description: "Selecione um horário", variant: "destructive" });
      return;
    }

    if (!todosDias && diasSelecionados.length === 0 && !editingHorario) {
      toast({ title: "Erro", description: "Selecione pelo menos um dia", variant: "destructive" });
      return;
    }

    const horarioFormatado = horario.length === 5 ? `${horario}:00` : horario;

    if (editingHorario) {
      updateMutation.mutate({
        id: editingHorario.id,
        data: {
          dia_semana: todosDias ? null : diasSelecionados[0],
          horario: horarioFormatado,
          tipo_reuniao: tipoReuniao,
        },
      });
    } else {
      createMutation.mutate({
        dias_semana: todosDias ? null : diasSelecionados,
        horario: horarioFormatado,
        tipo_reuniao: tipoReuniao,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este horário?")) {
      deleteMutation.mutate(id);
    }
  };

  const groupedHorarios = horarios.reduce((acc: Record<string, Horario[]>, h) => {
    const key = h.dia_semana === null ? "todos" : String(h.dia_semana);
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  const getDiaLabel = (key: string) => {
    if (key === "todos") return "Todos os dias";
    const dia = DIAS_SEMANA.find((d) => String(d.value) === key);
    return dia?.nome || key;
  };

  const getTipoIcon = (tipo: string) => {
    const t = TIPOS_REUNIAO.find((tr) => tr.value === tipo);
    return t?.icon || Video;
  };

  const getTipoLabel = (tipo: string) => {
    const t = TIPOS_REUNIAO.find((tr) => tr.value === tipo);
    return t?.label || tipo;
  };

  const formatHorario = (time: string) => {
    return time?.substring(0, 5) || time;
  };

  const getPeriodoColor = (periodo: string) => {
    switch (periodo) {
      case "manhã":
        return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
      case "tarde":
        return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
      case "noite":
        return "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400";
      default:
        return "bg-gray-500/20 text-gray-600 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/reuniao")} data-testid="button-voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Horários Disponíveis</h1>
            <p className="text-muted-foreground">Configure os horários disponíveis para agendamento de reuniões</p>
          </div>
        </div>
        <Button onClick={openAddModal} className="gap-2" data-testid="button-add-horario">
          <Plus className="h-4 w-4" /> Adicionar Horário
        </Button>
      </div>

      {horarios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-empty-state">Nenhum horário configurado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione horários disponíveis para que clientes possam agendar reuniões
            </p>
            <Button onClick={openAddModal} className="gap-2" data-testid="button-add-horario-empty">
              <Plus className="h-4 w-4" /> Adicionar Primeiro Horário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.keys(groupedHorarios)
            .sort((a, b) => {
              if (a === "todos") return -1;
              if (b === "todos") return 1;
              return Number(a) - Number(b);
            })
            .map((key) => (
              <Card key={key} data-testid={`card-horarios-${key}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium" data-testid={`title-dia-${key}`}>{getDiaLabel(key)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedHorarios[key]
                      .sort((a, b) => a.horario.localeCompare(b.horario))
                      .map((h) => {
                        const TipoIcon = getTipoIcon(h.tipo_reuniao);
                        return (
                          <div
                            key={h.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                            data-testid={`row-horario-${h.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-lg font-medium" data-testid={`text-horario-${h.id}`}>{formatHorario(h.horario)}</span>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPeriodoColor(h.periodo)}`} data-testid={`badge-periodo-${h.id}`}>
                                {h.periodo}
                              </span>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <TipoIcon className="h-4 w-4" />
                                <span className="text-sm" data-testid={`text-tipo-${h.id}`}>{getTipoLabel(h.tipo_reuniao)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`switch-${h.id}`} className="text-sm text-muted-foreground">
                                  {h.ativo ? "Ativo" : "Inativo"}
                                </Label>
                                <Switch
                                  id={`switch-${h.id}`}
                                  checked={h.ativo}
                                  onCheckedChange={(checked) => toggleMutation.mutate({ id: h.id, ativo: checked })}
                                  data-testid={`switch-ativo-${h.id}`}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(h)}
                                data-testid={`button-edit-${h.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(h.id)}
                                data-testid={`button-delete-${h.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-horario">
          <DialogHeader>
            <DialogTitle>{editingHorario ? "Editar Horário" : "Adicionar Horário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Dias da Semana</Label>
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="todos-dias"
                  checked={todosDias}
                  onCheckedChange={handleTodosDiasChange}
                  data-testid="checkbox-todos-dias"
                />
                <Label htmlFor="todos-dias" className="text-sm font-normal cursor-pointer">
                  Todos os dias
                </Label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`dia-${dia.value}`}
                      checked={diasSelecionados.includes(dia.value)}
                      onCheckedChange={(checked) => handleDiaChange(dia.value, checked as boolean)}
                      disabled={todosDias}
                      data-testid={`checkbox-dia-${dia.value}`}
                    />
                    <Label
                      htmlFor={`dia-${dia.value}`}
                      className={`text-sm font-normal cursor-pointer ${todosDias ? "text-muted-foreground" : ""}`}
                    >
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                data-testid="input-horario"
              />
            </div>

            <div className="space-y-3">
              <Label>Tipo de Reunião</Label>
              <RadioGroup value={tipoReuniao} onValueChange={setTipoReuniao}>
                {TIPOS_REUNIAO.map((tipo) => (
                  <div key={tipo.value} className="flex items-center gap-2">
                    <RadioGroupItem value={tipo.value} id={`tipo-${tipo.value}`} data-testid={`radio-tipo-${tipo.value}`} />
                    <Label htmlFor={`tipo-${tipo.value}`} className="flex items-center gap-2 cursor-pointer">
                      <tipo.icon className="h-4 w-4" />
                      {tipo.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} data-testid="button-cancelar">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-salvar"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingHorario ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
