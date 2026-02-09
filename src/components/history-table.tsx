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
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, TrendingDown, TrendingUp } from "lucide-react";
import type { DatacorpCheck } from "@shared/db-schema";
import { extractSubjectInfo } from "@/lib/payloadUtils";

interface HistoryTableProps {
  data: DatacorpCheck[];
  isLoading?: boolean;
  onViewDetails?: (check: DatacorpCheck) => void;
}

export function HistoryTable({ data, isLoading, onViewDetails }: HistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter(check => {
    if (!searchTerm) return true;
    return check.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           check.status.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Processos</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma consulta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((check) => {
                  const payload = check.payload as any;
                  const subjectInfo = extractSubjectInfo(payload);
                  const costSaved = check.apiCost === "0.00";
                  
                  const checkAny = check as any;
                  const displayName = checkAny.personName || subjectInfo.name;
                  const displayCpf = checkAny.personCpf || subjectInfo.cpf;
                  
                  return (
                    <TableRow 
                      key={check.id} 
                      className="hover:bg-muted/50 cursor-pointer"
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
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          Number(check.riskScore) <= 3 ? "text-green-600" :
                          Number(check.riskScore) <= 6 ? "text-yellow-600" :
                          "text-red-600"
                        }`}>
                          {Number(check.riskScore).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {subjectInfo.totalLawsuits}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {costSaved ? (
                            <Badge variant="secondary" className="gap-1 bg-green-50 text-green-700">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails?.(check);
                          }}
                          data-testid={`button-view-${check.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
