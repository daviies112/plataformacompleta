import { useState, useMemo, useRef } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/produto/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/produto/components/ui/select";
import { Checkbox } from "@/features/produto/components/ui/checkbox";
import { MoreHorizontal, Edit, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";

export const PrintQueueList = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [filters, setFilters] = useState({
    codigoBarras: "",
    referencia: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    preco: "",
    qtde: "",
    parcelas: "",
  });

  const printQueueItems = [
    {
      id: "1",
      foto: "🖼️",
      codigoBarras: "9398456559434",
      referencia: "",
      descricao: "PULSEIRA FLOR ZIRCONIA LIGHT ROSE 17+17 MM",
      categoria: "PULSEIRA",
      subcategoria: "",
      preco: "R$ 161,92",
      qtde: 3,
      parcelas: "",
    },
    {
      id: "2",
      foto: "🖼️",
      codigoBarras: "3705653292693",
      referencia: "",
      descricao: "BRACELETE COM 3 ZIRCÔNIAS GRANDES",
      categoria: "BRACELETE",
      subcategoria: "",
      preco: "R$ 192,96",
      qtde: 5,
      parcelas: "",
    },
    {
      id: "3",
      foto: "🖼️",
      codigoBarras: "4316436718584",
      referencia: "",
      descricao: "RELICÁRIO OU DIFUSOR CORAÇÃO COM DETALHES 20MM E C",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 88,83",
      qtde: 16,
      parcelas: "",
    },
    {
      id: "4",
      foto: "🖼️",
      codigoBarras: "5462103993804",
      referencia: "",
      descricao: "PINGENTE FERRADURA CRAVEJADA",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 92,64",
      qtde: 4,
      parcelas: "",
    },
    {
      id: "5",
      foto: "🖼️",
      codigoBarras: "9696864875352",
      referencia: "",
      descricao: "COLAR COM PINGENTE CORAÇÃO LUXO CRAVEJADO DE ZIRC",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 206,56",
      qtde: 2,
      parcelas: "",
    },
    {
      id: "6",
      foto: "🖼️",
      codigoBarras: "6582713684252",
      referencia: "",
      descricao: "PINGENTE ÁRVORE DA VIDA GRANDE",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 147,84",
      qtde: 10,
      parcelas: "",
    },
    {
      id: "7",
      foto: "🖼️",
      codigoBarras: "1766160350339",
      referencia: "",
      descricao: "PINGENTE DE FLOR COM CRISTA",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 66,40",
      qtde: 5,
      parcelas: "",
    },
    {
      id: "8",
      foto: "🖼️",
      codigoBarras: "2848301141019",
      referencia: "",
      descricao: "PULSEIRA INFANTIL MASCULINA TRAMA OVAL",
      categoria: "PULSEIRA",
      subcategoria: "",
      preco: "R$ 83,27",
      qtde: 10,
      parcelas: "",
    },
    {
      id: "9",
      foto: "🖼️",
      codigoBarras: "2155366793191",
      referencia: "",
      descricao: "PINGENTE CRUZ INCRUSTADA DE ZIRCÔNIA",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 83,93",
      qtde: 5,
      parcelas: "",
    },
    {
      id: "10",
      foto: "🖼️",
      codigoBarras: "8118516598712",
      referencia: "",
      descricao: "PINGENTE PONTO DE LUZ DE CORAÇÃO PP",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 61,47",
      qtde: 5,
      parcelas: "",
    },
    {
      id: "11",
      foto: "🖼️",
      codigoBarras: "8010130413450",
      referencia: "",
      descricao: "PINGENTE DE CORAÇÃO INCRUSTADO DE ZIRCÔNIA (M)",
      categoria: "PINGENTE",
      subcategoria: "",
      preco: "R$ 57,42",
      qtde: 8,
      parcelas: "",
    },
  ];

  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      toast.error("Nenhum item para exportar");
      return;
    }

    const dataToExport = filteredItems.map(item => ({
      'Código de Barras': item.codigoBarras,
      'Referência': item.referencia,
      'Descrição': item.descricao,
      'Categoria': item.categoria,
      'Subcategoria': item.subcategoria,
      'Preço': item.preco,
      'Quantidade': item.qtde,
      'Parcelas': item.parcelas
    }));

    exportToExcel(dataToExport, 'fila-impressao', 'Fila de Impressão');
    toast.success(`${filteredItems.length} itens exportados`);
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromExcel<any>(file);
      
      if (data.length === 0) {
        toast.error("Arquivo vazio");
        return;
      }

      toast.success(`${data.length} itens importados com sucesso`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error("Erro ao importar arquivo");
    }
  };

  const filteredItems = useMemo(() => {
    let result = printQueueItems;
    
    // Filter by category dropdown
    if (selectedCategory) {
      result = result.filter(item => 
        item.categoria.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Filter by subcategory dropdown
    if (selectedSubcategory) {
      result = result.filter(item => 
        item.subcategoria.toLowerCase().includes(selectedSubcategory.toLowerCase())
      );
    }
    
    // Filter by search inputs
    result = result.filter((item) => {
      const matchCodigo = item.codigoBarras.toLowerCase().includes(filters.codigoBarras.toLowerCase());
      const matchReferencia = item.referencia.toLowerCase().includes(filters.referencia.toLowerCase());
      const matchDescricao = item.descricao.toLowerCase().includes(filters.descricao.toLowerCase());
      const matchCategoria = item.categoria.toLowerCase().includes(filters.categoria.toLowerCase());
      const matchSubcategoria = item.subcategoria.toLowerCase().includes(filters.subcategoria.toLowerCase());
      const matchPreco = item.preco.toLowerCase().includes(filters.preco.toLowerCase());
      const matchQtde = item.qtde.toString().includes(filters.qtde);
      const matchParcelas = item.parcelas.toLowerCase().includes(filters.parcelas.toLowerCase());
      
      return matchCodigo && matchReferencia && matchDescricao && matchCategoria && 
             matchSubcategoria && matchPreco && matchQtde && matchParcelas;
    });
    
    return result;
  }, [printQueueItems, selectedCategory, selectedSubcategory, filters]);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anel">ANEL</SelectItem>
                <SelectItem value="bracelete">BRACELETE</SelectItem>
                <SelectItem value="brinco">BRINCO</SelectItem>
                <SelectItem value="colar">COLAR</SelectItem>
                <SelectItem value="piercing">PIERCING</SelectItem>
                <SelectItem value="pingente">PINGENTE</SelectItem>
                <SelectItem value="pulseira">PULSEIRA</SelectItem>
                <SelectItem value="tornozeleira">TORNOZELEIRA</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Subcategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sub1">Subcategoria 1</SelectItem>
                <SelectItem value="sub2">Subcategoria 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportExcel}
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button 
              onClick={() => toast.success("Item adicionado à fila de impressão")}
            >
              Adicionar
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            01 - Modelo fino (92MMx10MM)
          </h3>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-20">Foto</TableHead>
                  <TableHead>Cód de Barras</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="w-20">Qtde</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.codigoBarras}
                      onChange={(e) => setFilters(prev => ({ ...prev, codigoBarras: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.referencia}
                      onChange={(e) => setFilters(prev => ({ ...prev, referencia: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.descricao}
                      onChange={(e) => setFilters(prev => ({ ...prev, descricao: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.categoria}
                      onChange={(e) => setFilters(prev => ({ ...prev, categoria: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.subcategoria}
                      onChange={(e) => setFilters(prev => ({ ...prev, subcategoria: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.preco}
                      onChange={(e) => setFilters(prev => ({ ...prev, preco: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.qtde}
                      onChange={(e) => setFilters(prev => ({ ...prev, qtde: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead>
                    <Input 
                      placeholder="🔍" 
                      className="h-8 text-xs"
                      value={filters.parcelas}
                      onChange={(e) => setFilters(prev => ({ ...prev, parcelas: e.target.value }))}
                    />
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-2xl">
                        {item.foto}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        {item.codigoBarras}
                      </span>
                    </TableCell>
                    <TableCell>{item.referencia}</TableCell>
                    <TableCell className="max-w-xs">{item.descricao}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.subcategoria}</TableCell>
                    <TableCell>{item.preco}</TableCell>
                    <TableCell className="text-center">{item.qtde}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toast.info("Editar parcelas em desenvolvimento")}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => toast.info("Mais opções em desenvolvimento")}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};
