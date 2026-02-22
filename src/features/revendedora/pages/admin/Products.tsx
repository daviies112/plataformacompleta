import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search, Package, Plus, Pencil, Trash2, Bell, Settings,
  AlertTriangle, BarChart3, Boxes, Upload, Download, Printer, Filter,
  Check, X, ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from "date-fns/locale/pt-BR";
import { formatDateBRT } from "@/features/produto/lib/datetime";
import { exportToExcel, importFromExcel } from "@/features/produto/lib/exportUtils";
import type { Category, Supplier } from "@/features/produto/types/database.types";

import { BestSellingProducts } from '@/components/inventory/BestSellingProducts';
import { LowStockAlert } from '@/components/inventory/LowStockAlert';
import { ProductEditModal } from '@/components/inventory/ProductEditModal';
import { StockForecastPanel } from '@/components/inventory/StockForecastPanel';
import { ProductInventorySettingsModal } from '@/components/inventory/ProductInventorySettingsModal';
import { useProductAnalytics } from '@/hooks/useProductAnalytics';

import { LabelConfigDialog } from "@/features/produto/components/Printer/LabelConfigDialog";
import { ImportWithImagesDialog } from "@/features/produto/components/Products/ImportWithImagesDialog";
import AdminProductRequests from "@/features/revendedora/pages/admin/ProductRequests";
import { CategoryList } from "@/features/produto/components/Categories/CategoryList";
import { SupplierList } from "@/features/produto/components/Suppliers/SupplierList";
import { CategoryForm } from "@/features/produto/components/Categories/CategoryForm";
import { SupplierForm } from "@/features/produto/components/Suppliers/SupplierForm";
import { useCategories } from "@/features/produto/hooks/useCategories";
import { useSuppliers } from "@/features/produto/hooks/useSuppliers";
import type { PrinterSettings } from "@/pages/Index";
import { ClipboardList, Tags, Truck } from 'lucide-react';
import { PrinterConfig } from "@/features/produto/components/Printer/PrinterConfig";
import { PrintQueueList } from "@/features/produto/components/PrintQueue/PrintQueueList";
import { ResellerList } from "@/features/produto/components/Resellers/ResellerList";
import { ResellerForm } from "@/features/produto/components/Resellers/ResellerForm";
import { useResellers } from "@/features/produto/hooks/useResellers";
import { Users } from 'lucide-react';

interface Product {
  id: string;
  description: string | null;
  reference: string | null;
  image: string | null;
  barcode: string | null;
  category: string | null;
  subcategory?: string | null;
  price: number | null;
  stock: number | null;
  number?: string | null;
  color?: string | null;
  created_at?: string | null;
  createdAt?: string | Date; // Compatibility for import
  low_stock_threshold?: number | null;
  notify_low_stock?: boolean;
  tags?: string[];
}

// Printer defaults if not passed (though page should pass them)
const defaultPrinterSettings: PrinterSettings = {
  printerModel: "",
  exePath: "",
  printerPort: "",
  barcodeType: "product-code",
  labelSize: "92x10",
  enabledFields: {
    supplier: false,
    reference: true,
    number: true,
    weight: false,
    goldPlatingMillesimal: false,
    purchaseCost: false,
    goldPlatingCost: false,
    rhodiumPlatingCost: false,
    silverPlatingCost: false,
    varnishCost: false,
    laborCost: false,
    wholesalePrice: false,
    retailPrice: true,
    nfeData: false,
  },
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inventorySettingsProduct, setInventorySettingsProduct] = useState<any>(null);
  const [inventorySettingsOpen, setInventorySettingsOpen] = useState(false);

  // Feature: Import/Export/Print
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedProductToPrint, setSelectedProductToPrint] = useState<Product | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog');

  const categoryFileInputRef = useRef<HTMLInputElement>(null);
  const supplierFileInputRef = useRef<HTMLInputElement>(null);
  const resellerFileInputRef = useRef<HTMLInputElement>(null);

  const { categories, addCategory, updateCategory } = useCategories();
  const { suppliers, addSupplier, updateSupplier } = useSuppliers();
  const { resellers, addReseller, updateReseller } = useResellers();

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showResellerForm, setShowResellerForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editingReseller, setEditingReseller] = useState<any>(null);

  // We assume printerSettings might come from parent or context in future, 
  // currently we use defaults or we could fetch them. 
  // For now, using defaults to ensure it works standalone.
  // For now, using defaults to ensure it works standalone.
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(defaultPrinterSettings);

  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  const { bestSellers, lowStockProducts, loading: analyticsLoading, refetch: refetchAnalytics } = useProductAnalytics();

  const [categoryFilters, setCategoryFilters] = useState({
    nome: "",
    etiqueta: "",
    etiquetaCustomizada: "",
  });

  const [supplierFilters, setSupplierFilters] = useState({
    nome: "",
    cpfCnpj: "",
    cidade: "",
    uf: "",
    email: "",
    telefone: "",
  });

  const [resellerFilters, setResellerFilters] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  });

  const [filters, setFilters] = useState({
    barcode: "",
    reference: "",
    description: "",
    number: "",
    color: "",
    category: "",
    subcategory: "",
    price: "",
    stock: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  // Initialize Supabase client
  useEffect(() => {
    let mounted = true;

    async function initClient() {
      try {
        const client = await getSupabaseClient();
        if (mounted && client) {
          setSupabaseClient(client);
        }
      } catch (err) {
        console.error('[Products] Failed to init Supabase client:', err);
        toast.error('Erro ao conectar ao banco de dados');
        setLoading(false);
      }
    }

    initClient();
    return () => { mounted = false; };
  }, []);

  const loadProducts = useCallback(async () => {
    if (!supabaseClient) return;

    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('description');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [supabaseClient]);

  // Load products when client is ready
  useEffect(() => {
    if (supabaseClient) {
      loadProducts();
    }
  }, [supabaseClient, loadProducts]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const handleSaved = () => {
    loadProducts();
    refetchAnalytics();
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, id]);
    } else {
      setSelectedProducts(prev => prev.filter(pid => pid !== id));
      setSelectAll(false);
    }
  };

  // ----- Filtering Logic -----
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Basic Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (product.description || '').toLowerCase().includes(searchLower) ||
        (product.barcode || '').toLowerCase().includes(searchLower) ||
        (product.reference || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Advanced Filters
      const matchBarcode = (product.barcode || '').toLowerCase().includes(filters.barcode.toLowerCase());
      const matchReference = (product.reference || '').toLowerCase().includes(filters.reference.toLowerCase());
      const matchDescription = (product.description || '').toLowerCase().includes(filters.description.toLowerCase());
      const matchNumber = (product.number || '').toLowerCase().includes(filters.number.toLowerCase());
      const matchColor = (product.color || '').toLowerCase().includes(filters.color.toLowerCase());
      const matchCategory = (product.category || '').toLowerCase().includes(filters.category.toLowerCase());
      const matchSubcategory = (product.subcategory || '').toLowerCase().includes(filters.subcategory.toLowerCase());
      const matchPrice = (product.price?.toString() || '').includes(filters.price); // Simplified string match
      const matchStock = (product.stock?.toString() || '').includes(filters.stock);

      // Date Filter
      let matchDate = true;
      const dateStr = product.created_at || (product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt);

      if ((filters.startDate || filters.endDate) && dateStr) {
        const productDate = new Date(dateStr);
        productDate.setHours(0, 0, 0, 0);

        if (filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          matchDate = productDate >= start && productDate <= end;
        } else if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          matchDate = productDate >= start;
        } else if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          matchDate = productDate <= end;
        }
      }

      return matchBarcode && matchReference && matchDescription && matchNumber &&
        matchColor && matchCategory && matchSubcategory && matchPrice &&
        matchStock && matchDate;
    });
  }, [products, searchTerm, filters]);


  const handleImportComplete = (newProducts: any[]) => {
    // ImportWithImagesDialog calls this on success
    // If it returns products, we might want to reload
    loadProducts();
    toast.success("Produtos importados via diálogo!");
  };


  const getStockStatus = (product: Product) => {
    const stock = product.stock ?? 0;
    const threshold = product.low_stock_threshold ?? 5;

    if (stock === 0) return 'out_of_stock';
    if (stock <= threshold) return 'low_stock';
    return 'in_stock';
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);


  const handleOpenInventorySettings = (product: any) => {
    setInventorySettingsProduct(product);
    setInventorySettingsOpen(true);
  };

  const handleInventorySettingsSaved = () => {
    loadProducts();
    refetchAnalytics();
  };

  const handleAddNew = () => {
    if (activeTab === 'catalog') {
      setEditingProduct(null);
      setEditModalOpen(true);
    } else if (activeTab === 'categories') {
      setEditingCategory(null);
      setShowCategoryForm(true);
    } else if (activeTab === 'suppliers') {
      setEditingSupplier(null);
      setEditingSupplier(null);
      setShowSupplierForm(true);
    } else if (activeTab === 'resellers') {
      setEditingReseller(null);
      setShowResellerForm(true);
    }
  };

  const handleImportClick = () => {
    if (activeTab === 'catalog') {
      setImportDialogOpen(true);
    } else if (activeTab === 'categories') {
      categoryFileInputRef.current?.click();
    } else if (activeTab === 'suppliers') {
      supplierFileInputRef.current?.click();
    } else if (activeTab === 'resellers') {
      resellerFileInputRef.current?.click();
    }
  };

  const handleExportClick = () => {
    // We'll need to pass export triggers down or move the logic here.
    // For now, let's assume we want to trigger it.
    // Actually, it might be easier to just remove export if they don't use it much,
    // but I'll try to keep it.
  };

  const handleImportCategoryExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromExcel<any>(file);
      if (data.length === 0) {
        toast.error("Arquivo vazio");
        return;
      }
      const importedCategories: Category[] = data.map((row: any, index: number) => ({
        id: String(Date.now() + index),
        nome: row['Categoria'] || row.nome || '',
        etiqueta: row['Etiqueta'] || row.etiqueta || '',
        etiquetaCustomizada: row['Etiqueta Customizada'] || row.etiquetaCustomizada || '',
        produtosVinculados: Number(row['Produtos Vinculados'] || row.produtosVinculados || 0)
      }));
      importedCategories.forEach(cat => addCategory(cat));
      toast.success(`${importedCategories.length} categorias importadas`);
      if (categoryFileInputRef.current) categoryFileInputRef.current.value = '';
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error("Erro ao importar arquivo");
    }
  };

  const handleImportSupplierExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromExcel<any>(file);
      if (data.length === 0) {
        toast.error("Arquivo vazio");
        return;
      }
      const importedSuppliers: Supplier[] = data.map((row: any, index: number) => ({
        id: String(Date.now() + index),
        nome: row['Nome'] || row.nome || '',
        cpfCnpj: row['CPF/CNPJ'] || row.cpfCnpj || '',
        razaoSocial: row['Razão Social'] || row.razaoSocial,
        inscricaoEstadual: row['Inscrição Estadual'] || row.inscricaoEstadual,
        referencia: row['Referência'] || row.referencia,
        endereco: row['Endereço'] || row.endereco,
        numero: row['Número'] || row.numero,
        bairro: row['Bairro'] || row.bairro,
        cidade: row['Cidade'] || row.cidade || '',
        uf: row['UF'] || row.uf || '',
        cep: row['CEP'] || row.cep,
        pais: row['País'] || row.pais,
        nomeContato: row['Nome Contato'] || row.nomeContato,
        email: row['Email'] || row.email || '',
        telefone: row['Telefone'] || row.telefone || '',
        telefone2: row['Telefone 2'] || row.telefone2,
        whatsapp: row['WhatsApp'] || row.whatsapp,
        observacoes: row['Observações'] || row.observacoes
      }));
      importedSuppliers.forEach(sup => addSupplier(sup));
      toast.success(`${importedSuppliers.length} fornecedores importados`);
      if (supplierFileInputRef.current) supplierFileInputRef.current.value = '';
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error("Erro ao importar arquivo");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando produtos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Produção e Estoque</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Gerencie seu catálogo de forma completa
          </p>
        </div>

        {/* Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2">

          <input
            type="file"
            ref={resellerFileInputRef}
            className="hidden"
            accept=".xlsx, .xls"
            onChange={async (e) => {
              // Similar logic for resellers import
              // For brevity, skipping implementation here unless requested
              // But assuming we might want it later
              toast.info("Importação de revendedoras em breve");
            }}
          />

          <Button
            variant="outline"
            className="gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border shadow-xs active:shadow-none min-h-9 px-4 py-2"
            onClick={handleImportClick}
          >
            <Boxes className="w-4 h-4" />
            {activeTab === 'catalog' ? 'Importar dados Jueri' : 'Importar'}
          </Button>

          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros Avançados</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pt-4 overflow-y-auto max-h-[calc(100vh-100px)] px-1">
                {activeTab === 'catalog' && (
                  <>
                    <div>
                      <Label>Código de Barras</Label>
                      <Input
                        placeholder="Buscar por código..."
                        value={filters.barcode}
                        onChange={(e) => setFilters({ ...filters, barcode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Referência</Label>
                      <Input
                        placeholder="Buscar por referência..."
                        value={filters.reference}
                        onChange={(e) => setFilters({ ...filters, reference: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        placeholder="Buscar por descrição..."
                        value={filters.description}
                        onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input
                        placeholder="Buscar por número..."
                        value={filters.number}
                        onChange={(e) => setFilters({ ...filters, number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Cor</Label>
                      <Input
                        placeholder="Buscar por cor..."
                        value={filters.color}
                        onChange={(e) => setFilters({ ...filters, color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Input
                        placeholder="Buscar por categoria..."
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Preço (Contém)</Label>
                      <Input
                        type="number"
                        placeholder="Valor aproximado..."
                        value={filters.price}
                        onChange={(e) => setFilters({ ...filters, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Data Inicial</Label>
                      <div className="border rounded-md p-2">
                        <Calendar
                          mode="single"
                          selected={filters.startDate}
                          onSelect={(date) => setFilters({ ...filters, startDate: date })}
                          locale={ptBR}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Data Final</Label>
                      <div className="border rounded-md p-2">
                        <Calendar
                          mode="single"
                          selected={filters.endDate}
                          onSelect={(date) => setFilters({ ...filters, endDate: date })}
                          locale={ptBR}
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'categories' && (
                  <>
                    <div>
                      <Label>Nome</Label>
                      <Input
                        placeholder="Buscar por nome..."
                        value={categoryFilters.nome}
                        onChange={(e) => setCategoryFilters({ ...categoryFilters, nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Etiqueta</Label>
                      <Input
                        placeholder="Buscar por etiqueta..."
                        value={categoryFilters.etiqueta}
                        onChange={(e) => setCategoryFilters({ ...categoryFilters, etiqueta: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'suppliers' && (
                  <>
                    <div>
                      <Label>Nome</Label>
                      <Input
                        placeholder="Buscar por nome..."
                        value={supplierFilters.nome}
                        onChange={(e) => setSupplierFilters({ ...supplierFilters, nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        placeholder="Buscar por cidade..."
                        value={supplierFilters.cidade}
                        onChange={(e) => setSupplierFilters({ ...supplierFilters, cidade: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-4 pb-8">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (activeTab === 'catalog') {
                        setFilters({
                          barcode: "", reference: "", description: "", number: "",
                          color: "", category: "", subcategory: "", price: "",
                          stock: "", startDate: undefined, endDate: undefined,
                        });
                      } else if (activeTab === 'categories') {
                        setCategoryFilters({ nome: "", etiqueta: "", etiquetaCustomizada: "" });
                      } else if (activeTab === 'suppliers') {
                        setSupplierFilters({ nome: "", cpfCnpj: "", cidade: "", uf: "", email: "", telefone: "" });
                      } else if (activeTab === 'resellers') {
                        setResellerFilters({ nome: "", cpf: "", email: "", telefone: "" });
                      }
                    }}
                  >
                    Limpar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setFilterOpen(false)}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === 'catalog' ? 'Novo Produto' :
              activeTab === 'categories' ? 'Adicionar Categoria' :
                activeTab === 'suppliers' ? 'Adicionar Fornecedor' :
                  activeTab === 'resellers' ? 'Adicionar Revendedora' : 'Adicionar'}
          </Button>
        </div>
      </div>

      {
        lowStockProducts.length > 0 && (
          <LowStockAlert products={lowStockProducts} loading={analyticsLoading} compact />
        )
      }

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 max-w-6xl h-auto">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Catálogo & Estoque
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Projeções
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="resellers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Revendedoras
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Solicitações
          </TabsTrigger>
          <TabsTrigger value="printer-config" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Config. Impressora
          </TabsTrigger>
          <TabsTrigger value="print-queue" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Fila de Impressão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BestSellingProducts products={bestSellers} loading={analyticsLoading} />
            </div>
            <div>
              <LowStockAlert products={lowStockProducts} loading={analyticsLoading} />
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Catálogo de Produtos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedProducts.length} selecionados de {filteredProducts.length} filtrados
                </p>
              </div>
              <CardDescription>
                Gerencie inventário, imprima etiquetas e acompanhe status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Busca rápida por descrição, código ou referência..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Imagem</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="hidden md:table-cell">Ref.</TableHead>
                      <TableHead className="hidden md:table-cell">Cód.</TableHead>
                      <TableHead className="hidden lg:table-cell">Nº</TableHead>
                      <TableHead className="hidden lg:table-cell">Cor</TableHead>
                      <TableHead className="hidden lg:table-cell">Cat.</TableHead>
                      <TableHead className="hidden xl:table-cell">Subcat.</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead className="hidden xl:table-cell">Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const threshold = product.low_stock_threshold ?? 5;
                      const hasNotification = product.notify_low_stock !== false;
                      const isSelected = selectedProducts.includes(product.id);

                      return (
                        <TableRow key={product.id} className={stockStatus === 'out_of_stock' ? 'bg-red-50/40' : (isSelected ? 'bg-accent/50' : '')}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                              {product.image ? (
                                <img src={product.image} alt={product.description || 'Produto'} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{product.description || 'Sem descrição'}</div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              {product.reference} {product.barcode}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{product.reference}</TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs">{product.barcode || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{product.number || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{product.color || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {product.category && (
                              <Badge variant="secondary" className="text-xs font-normal">{product.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">{product.subcategory || '-'}</TableCell>
                          <TableCell className="font-semibold text-sm">
                            {product.price ? formatCurrency(product.price) : '-'}
                          </TableCell>
                          <TableCell>
                            {product.stock !== null && product.stock !== undefined ? (
                              stockStatus === 'out_of_stock' ? (
                                <Badge variant="destructive" className="h-6 text-xs">0</Badge>
                              ) : stockStatus === 'low_stock' ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1 h-6 text-xs">
                                        <AlertTriangle className="h-3 w-3" />
                                        {product.stock}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Estoque baixo! Limite: {threshold}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge variant="outline" className="h-6 text-xs">{product.stock}</Badge>
                              )
                            ) : (
                              <Badge variant="outline">-</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                            {product.created_at ? formatDateBRT(product.created_at) : (product.createdAt instanceof Date ? formatDateBRT(product.createdAt.toISOString()) : '-')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setSelectedProductToPrint(product);
                                  setPrintDialogOpen(true);
                                }}
                                title="Imprimir Etiqueta"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                onClick={() => handleEdit(product)}
                                title="Editar Produto"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Nenhum produto encontrado com os filtros atuais.' : 'Nenhum produto cadastrado'}
                  </p>
                  {!searchTerm && (
                    <Button className="mt-4" onClick={() => setEditModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Primeiro Produto
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="mt-6">
          <StockForecastPanel onConfigureProduct={handleOpenInventorySettings} />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          {showCategoryForm ? (
            <CategoryForm
              onBack={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}
              onSave={(category) => {
                if ('id' in category) {
                  updateCategory(category as any);
                } else {
                  addCategory(category as any);
                }
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}
              initialData={editingCategory}
            />
          ) : (
            <CategoryList
              categories={categories as any}
              filters={categoryFilters}
              onEdit={(category) => {
                setEditingCategory(category);
                setShowCategoryForm(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          {showSupplierForm ? (
            <SupplierForm
              onBack={() => {
                setShowSupplierForm(false);
                setEditingSupplier(null);
              }}
              onSave={(supplier) => {
                if ('id' in supplier) {
                  updateSupplier(supplier as any);
                } else {
                  addSupplier(supplier as any);
                }
                setShowSupplierForm(false);
                setEditingSupplier(null);
              }}
              initialData={editingSupplier}
            />
          ) : (
            <SupplierList
              suppliers={suppliers as any}
              filters={supplierFilters}
              onEdit={(supplier) => {
                setEditingSupplier(supplier);
                setShowSupplierForm(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="resellers" className="mt-6">
          {showResellerForm ? (
            <ResellerForm
              onBack={() => {
                setShowResellerForm(false);
                setEditingReseller(null);
              }}
              onSave={(reseller) => {
                if ('id' in reseller) {
                  updateReseller(reseller as any);
                } else {
                  addReseller(reseller as any);
                }
                setShowResellerForm(false);
                setEditingReseller(null);
              }}
              initialData={editingReseller}
            />
          ) : (
            <ResellerList
              resellers={resellers as any}
              // filters={resellerFilters} // Assume ResellerList takes full list for now or add filter logic later
              onEdit={(reseller) => {
                setEditingReseller(reseller);
                setShowResellerForm(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <AdminProductRequests embedded />
        </TabsContent>

        <TabsContent value="printer-config" className="mt-6">
          <PrinterConfig
            settings={printerSettings}
            onUpdateSettings={setPrinterSettings}
          />
        </TabsContent>

        <TabsContent value="print-queue" className="mt-6">
          <PrintQueueList />
        </TabsContent>
      </Tabs>

      <ProductEditModal
        product={editingProduct}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSaved={handleSaved}
      />

      <ProductInventorySettingsModal
        product={inventorySettingsProduct}
        isOpen={inventorySettingsOpen}
        onClose={() => setInventorySettingsOpen(false)}
        onSave={handleInventorySettingsSaved}
      />

      {
        selectedProductToPrint && (
          <LabelConfigDialog
            product={selectedProductToPrint}
            printerSettings={printerSettings}
            open={printDialogOpen}
            onOpenChange={(open) => {
              setPrintDialogOpen(open);
              if (!open) setSelectedProductToPrint(null);
            }}
          />
        )
      }

      <ImportWithImagesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </div >
  );
}
