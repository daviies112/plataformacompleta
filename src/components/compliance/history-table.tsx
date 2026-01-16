import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/compliance/status-badge";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, TrendingDown, TrendingUp, Download, FileText, Loader2, AlertTriangle, CheckCircle2, User, CreditCard } from "lucide-react";
import { formatCPF } from "@shared/schema";
import type { DatacorpCheck } from "@shared/schema";
import { extractSubjectInfo } from "@/lib/payloadUtils";
import { downloadPDF, downloadBulkPDF } from "@/lib/download-utils";
import { toast } from "sonner";
import { calculateUnifiedRisk } from "@/lib/riskCalculation";

interface HistoryTableProps {
  data: DatacorpCheck[];
  isLoading?: boolean;
  onViewDetails?: (check: DatacorpCheck) => void;
}

export function HistoryTable({ data, isLoading, onViewDetails }: HistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  console.log('[HistoryTable] Renderizando com:', { 
    dataLength: data?.length || 0, 
    isLoading, 
    searchTerm 
  });

  const filteredData = data.filter(check => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const checkAny = check as any;
    const displayName = checkAny.personName || checkAny.name || (checkAny.payload as any)?._basic_data?.Result?.[0]?.BasicData?.Name || "";
    const displayCpf = checkAny.personCpf || checkAny.cpf || (checkAny.payload as any)?._basic_data?.Result?.[0]?.BasicData?.TaxIdNumber || "";

    return check.id.toLowerCase().includes(term) ||
           check.status.toLowerCase().includes(term) ||
           displayName.toLowerCase().includes(term) ||
           displayCpf.toLowerCase().includes(term);
  });

  console.log('[HistoryTable] Dados filtrados:', filteredData.length, 'registros');

  const handleDownloadSingle = async (check: DatacorpCheck, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(check.id);
    try {
      await downloadPDF(check.id);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (filteredData.length === 0) return;
    setDownloadingAll(true);
    try {
      const ids = filteredData.map(check => check.id);
      await downloadBulkPDF(ids);
      toast.success('PDF do histórico gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF do histórico');
    } finally {
      setDownloadingAll(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Consultas</CardTitle>
          <CardDescription>Carregando consultas...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="history-table">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Histórico de Consultas</CardTitle>
            <CardDescription>
              {filteredData.length} consulta{filteredData.length !== 1 ? "s" : ""} encontrada{filteredData.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-history"
                aria-label="Buscar consultas por ID"
              />
            </div>
            <Button
              onClick={handleDownloadAll}
              disabled={filteredData.length === 0 || downloadingAll}
              variant="outline"
              className="gap-2 whitespace-nowrap"
              data-testid="button-download-all"
            >
              {downloadingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {downloadingAll ? 'Gerando PDF...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Dados</TableHead>
                <TableHead className="text-right">Risco</TableHead>
                <TableHead className="text-right">Processos</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhuma consulta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((check) => {
                  const payload = check.payload as any;
                  const subjectInfo = extractSubjectInfo(payload);
                  const costSaved = check.apiCost === "0.00";
                  
                  // Usar os campos diretos personName e personCpf quando disponíveis
                  const checkAny = check as any;
                  const displayName = checkAny.personName || subjectInfo.name;
                  const displayCpf = checkAny.personCpf || subjectInfo.cpf;
                  
                  // Extrair dados da consulta completa
                  const basicData = payload?._basic_data?.Result?.[0]?.BasicData;
                  const collections = payload?._collections?.Result?.[0]?.Collections;
                  const isCompleteConsultation = payload?._datacorp_complete === true;
                  const cpfStatus = basicData?.TaxIdStatus;
                  const hasDebt = collections?.HasActiveCollections || (collections?.TotalOccurrences && collections.TotalOccurrences > 0);
                  
                  return (
                    <TableRow 
                      key={check.id} 
                      className="hover-elevate cursor-pointer even:bg-muted/30"
                      onClick={() => onViewDetails?.(check)}
                      data-testid={`row-check-${check.id}`}
                    >
                      <TableCell className="font-mono text-xs">
                        {new Date(check.consultedAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm max-w-[200px] truncate" title={displayName}>
                          {displayName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {displayCpf}
                        </code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={check.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        {isCompleteConsultation ? (
                          <div className="flex items-center justify-center gap-1">
                            <div className="flex items-center" title={`CPF: ${cpfStatus || 'N/A'}`}>
                              <User className={`h-4 w-4 ${cpfStatus === 'Regular' ? 'text-green-600' : cpfStatus ? 'text-red-600' : 'text-gray-400'}`} />
                            </div>
                            <div className="flex items-center" title={hasDebt ? 'Possui cobranças' : 'Sem cobranças'}>
                              <CreditCard className={`h-4 w-4 ${hasDebt ? 'text-red-600' : 'text-green-600'}`} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const calculatedRisk = calculateUnifiedRisk(payload);
                          const displayRisk = calculatedRisk || Number(check.riskScore);
                          const riskInteger = Math.round(displayRisk);
                          return (
                            <span className={`font-semibold ${
                              riskInteger <= 3 ? "text-green-500" :
                              riskInteger <= 6 ? "text-amber-500" :
                              "text-red-500"
                            }`}>
                              {riskInteger}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(check as any).processCount ?? subjectInfo.totalLawsuits ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {costSaved ? (
                            <Badge variant="secondary" className="gap-1 bg-accent/10 text-accent">
                              <TrendingDown className="h-3 w-3" />
                              R$ 0,00
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              R$ {Number(check.apiCost).toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDownloadSingle(check, e)}
                            disabled={downloadingId === check.id}
                            data-testid={`button-download-${check.id}`}
                            title="Baixar PDF"
                          >
                            {downloadingId === check.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails?.(check);
                            }}
                            data-testid={`button-view-${check.id}`}
                            title="Visualizar detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
