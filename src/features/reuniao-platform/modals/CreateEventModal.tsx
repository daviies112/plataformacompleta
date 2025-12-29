import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useReuniao } from '../hooks/useReuniao';
import { format } from 'date-fns';

const formSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  tipo: z.enum(['online', 'presencial']),
  data: z.string().min(1, 'Data é obrigatória'),
  horaInicio: z.string().min(1, 'Hora de início é obrigatória'),
  horaFim: z.string().min(1, 'Hora de término é obrigatória'),
  local: z.string().optional(),
});

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  onSuccess?: () => void;
}

export default function CreateEventModal({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: CreateEventModalProps) {
  const { addMeeting, isCreating } = useReuniao();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: '',
      tipo: 'online',
      data: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      horaInicio: '09:00',
      horaFim: '10:00',
      local: '',
    },
  });

  useEffect(() => {
    if (defaultDate) {
      form.setValue('data', format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [defaultDate, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const dataInicio = new Date(`${values.data}T${values.horaInicio}:00`);
      const dataFim = new Date(`${values.data}T${values.horaFim}:00`);
      
      const duracao = Math.round((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60));

      await addMeeting({
        titulo: values.titulo,
        nome: values.tipo,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
        duracao,
        telefone: values.local, // Usando telefone como campo de local para compatibilidade
        status: 'agendada',
      });

      form.reset();
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agendar Nova Reunião</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reunião de Alinhamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Reunião</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="online">Online (100ms)</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="horaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horaFim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.watch('tipo') === 'presencial' && (
              <FormField
                control={form.control}
                name="local"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço ou sala" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Agendando...' : 'Agendar Reunião'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
