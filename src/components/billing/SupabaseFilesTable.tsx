import { Card } from "@/components/ui/card";
import { FileText, Download, Calendar, DollarSign, Building2, Image, FileEdit } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { SupabaseFile } from "@/hooks/useSupabaseFiles";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SupabaseFilesTableProps {
  files: SupabaseFile[];
}

export default function SupabaseFilesTable({ files }: SupabaseFilesTableProps) {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return "-";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  const getCategoryColor = (category: string | undefined) => {
    const colors: Record<string, string> = {
      'food': 'bg-orange-500/10 text-orange-500',
      'transport': 'bg-blue-500/10 text-blue-500',
      'health': 'bg-red-500/10 text-red-500',
      'entertainment': 'bg-purple-500/10 text-purple-500',
      'shopping': 'bg-pink-500/10 text-pink-500',
      'bills': 'bg-yellow-500/10 text-yellow-500',
      'morada': 'bg-indigo-500/10 text-indigo-500',
      'saúde': 'bg-red-500/10 text-red-500',
      'other': 'bg-gray-500/10 text-gray-500',
    };
    return colors[category?.toLowerCase() || 'other'] || colors.other;
  };

  const getFileTypeDisplay = (file: SupabaseFile) => {
    // Se foi criado manualmente pela plataforma
    if (file.type === 'manual') {
      return {
        icon: <FileEdit className="h-4 w-4 text-green-500" />,
        label: 'Manual',
        color: 'text-green-600 dark:text-green-400'
      };
    }
    
    // Arquivos locais ou do Supabase são Imagem
    return {
      icon: <Image className="h-4 w-4 text-blue-500" />,
      label: 'Imagem',
      color: 'text-blue-600 dark:text-blue-400'
    };
  };

  if (files.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum anexo encontrado no Supabase</p>
          <p className="text-sm mt-2">
            Configure o Supabase em Configurações para visualizar anexos
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos Financeiros ({files.length})
        </h3>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo do Arquivo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const fileType = getFileTypeDisplay(file);
              
              return (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {fileType.icon}
                      <span className={`${fileType.color} font-medium`}>
                        {fileType.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {file.category && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(file.category)}`}>
                        {file.category}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {file.amount && (
                      <span className="flex items-center gap-1 font-medium">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(file.amount)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(file.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {file.due_date && (
                      <span className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(file.due_date)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    {file.establishment ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate block text-sm">
                          {file.establishment}
                        </span>
                      </div>
                    ) : (
                      <span className="truncate block text-sm text-muted-foreground">
                        {file.description || "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Abrir
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
