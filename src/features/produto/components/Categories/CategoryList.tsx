import { useState, useMemo, useRef } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/produto/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/features/produto/components/ui/sheet";
import { Label } from "@/features/produto/components/ui/label";
import { Plus, MoreHorizontal, Upload, Download, Filter, Edit, Eye, Printer, Package } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/features/produto/types/database.types";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/produto/components/ui/dropdown-menu";

interface CategoryListProps {
  categories: Category[];
  filters?: {
    nome: string;
    etiqueta: string;
    etiquetaCustomizada: string;
  };
  onEdit: (category: Category) => void;
}

export const CategoryList = ({ categories, filters, onEdit }: CategoryListProps) => {
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      if (!filters) return true;
      const matchNome = category.nome.toLowerCase().includes(filters.nome.toLowerCase());
      const matchEtiqueta = category.etiqueta.toLowerCase().includes(filters.etiqueta.toLowerCase());
      const matchEtiquetaCustom = category.etiquetaCustomizada.toLowerCase().includes(filters.etiquetaCustomizada.toLowerCase());

      return matchNome && matchEtiqueta && matchEtiquetaCustom;
    });
  }, [categories, filters]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-0 py-4">
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Categoria</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Etiqueta Customizada</TableHead>
                <TableHead>Produtos Vinculados</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{category.nome}</TableCell>
                  <TableCell>{category.etiqueta}</TableCell>
                  <TableCell>{category.etiquetaCustomizada}</TableCell>
                  <TableCell>{category.produtosVinculados}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(category)}
                      title="Editar Categoria"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 text-sm text-muted-foreground">
          <span>Linhas por página:</span>
          <select className="border rounded px-2 py-1">
            <option>15</option>
            <option>30</option>
            <option>50</option>
          </select>
          <span>1-8 de 8</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>«</Button>
            <Button variant="outline" size="sm" disabled>‹</Button>
            <Button variant="outline" size="sm">1</Button>
            <Button variant="outline" size="sm" disabled>›</Button>
            <Button variant="outline" size="sm" disabled>»</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
