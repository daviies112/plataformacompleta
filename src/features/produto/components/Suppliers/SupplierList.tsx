import { useState, useMemo, useRef } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/produto/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Filter, MoreHorizontal, Upload, Download, X, Edit, Eye, Printer, FileText } from "lucide-react";
import { Badge } from "@/features/produto/components/ui/badge";
import { toast } from "sonner";
import type { Supplier } from "@/features/produto/types/database.types";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/produto/components/ui/dropdown-menu";

interface SupplierListProps {
  suppliers: Supplier[];
  filters?: {
    nome: string;
    cpfCnpj: string;
    cidade: string;
    uf: string;
    email: string;
    telefone: string;
  };
  onEdit: (supplier: Supplier) => void;
}

export const SupplierList = ({ suppliers, filters, onEdit }: SupplierListProps) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (!filters) return true;
      const matchNome = supplier.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchCpfCnpj = supplier.cpfCnpj.toLowerCase().includes(filters.cpfCnpj.toLowerCase());
      const matchCidade = supplier.cidade.toLowerCase().includes(filters.cidade.toLowerCase());
      // ... match other fields if needed, but keeping it simple for now

      return matchNome && matchCpfCnpj && matchCidade;
    });
  }, [suppliers, filters]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-0 py-4">
        {/* Suppliers Table */}
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">Ver Mais</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone 1</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <>
                  <TableRow key={supplier.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleRow(supplier.id)}
                      >
                        {expandedRows.includes(supplier.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{supplier.nome}</TableCell>
                    <TableCell>{supplier.cidade}</TableCell>
                    <TableCell>{supplier.uf}</TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>{supplier.telefone}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-green-500 text-green-700 bg-green-50"
                      >
                        ativo
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(supplier)}
                        title="Editar Fornecedor"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expandedRows.includes(supplier.id) && (
                    <TableRow key={`${supplier.id}-details`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold mb-3 text-foreground">Dados Cadastrais</h3>
                              <div className="space-y-2 text-sm">
                                <p><span className="font-medium">CPF/CNPJ:</span> {supplier.cpfCnpj || "—"}</p>
                                <p><span className="font-medium">Razão Social:</span> {supplier.razaoSocial || "—"}</p>
                                <p><span className="font-medium">Inscrição Estadual:</span> {supplier.inscricaoEstadual || "—"}</p>
                                <p><span className="font-medium">Referência:</span> {supplier.referencia || "—"}</p>
                              </div>
                            </div>

                            <div>
                              <h3 className="font-semibold mb-3 text-foreground">Endereço</h3>
                              <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Rua:</span> {supplier.endereco || "—"}</p>
                                <p><span className="font-medium">Número:</span> {supplier.numero || "—"}</p>
                                <p><span className="font-medium">Bairro:</span> {supplier.bairro || "—"}</p>
                                <p><span className="font-medium">CEP:</span> {supplier.cep || "—"}</p>
                                <p><span className="font-medium">País:</span> {supplier.pais || "—"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold mb-3 text-foreground">Contato</h3>
                              <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Nome do Contato:</span> {supplier.nomeContato || "—"}</p>
                                <p><span className="font-medium">Telefone 2:</span> {supplier.telefone2 || "—"}</p>
                                <p><span className="font-medium">WhatsApp:</span> {supplier.whatsapp || "—"}</p>
                              </div>
                            </div>

                            {supplier.observacoes && (
                              <div>
                                <h3 className="font-semibold mb-3 text-foreground">Observações</h3>
                                <p className="text-sm">{supplier.observacoes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
