import { useState, useEffect } from "react";
import { Header } from "@/features/produto/components/Layout/Header";
import { ProductList } from "@/features/produto/components/Products/ProductList";
import { ProductForm } from "@/features/produto/components/Products/ProductForm";
import { SupplierList } from "@/features/produto/components/Suppliers/SupplierList";
import { SupplierForm } from "@/features/produto/components/Suppliers/SupplierForm";
import { ResellerList } from "@/features/produto/components/Resellers/ResellerList";
import { ResellerForm } from "@/features/produto/components/Resellers/ResellerForm";
import { CategoryList } from "@/features/produto/components/Categories/CategoryList";
import { CategoryForm } from "@/features/produto/components/Categories/CategoryForm";
import { PrintQueueList } from "@/features/produto/components/PrintQueue/PrintQueueList";
import AdminProducts from "@/features/revendedora/pages/admin/Products";
import AdminProductRequests from "@/features/revendedora/pages/admin/ProductRequests";
import { BottomNav } from "@/features/produto/components/Layout/BottomNav";
import { MobileHeader } from "@/features/produto/components/Layout/MobileHeader";
import { MobileProductList } from "@/features/produto/components/Mobile/MobileProductList";
import { MobileProductForm } from "@/features/produto/components/Mobile/MobileProductForm";
import { MobileSupplierList } from "@/features/produto/components/Mobile/MobileSupplierList";
import { MobileSupplierForm } from "@/features/produto/components/Mobile/MobileSupplierForm";
import { MobileResellerList } from "@/features/produto/components/Mobile/MobileResellerList";
import { MobileResellerForm } from "@/features/produto/components/Mobile/MobileResellerForm";
import { MobileCategoryList } from "@/features/produto/components/Mobile/MobileCategoryList";
import { MobileCategoryForm } from "@/features/produto/components/Mobile/MobileCategoryForm";
import { MobilePrintQueueList } from "@/features/produto/components/Mobile/MobilePrintQueueList";
import { Dashboard } from "@/features/produto/components/Mobile/Dashboard";
import { PrinterConfig } from "@/features/produto/components/Printer/PrinterConfig";
import { useProducts } from "@/features/produto/hooks/useProducts";
import { useSuppliers } from "@/features/produto/hooks/useSuppliers";
import { useResellers } from "@/features/produto/hooks/useResellers";
import { useCategories } from "@/features/produto/hooks/useCategories";
import { usePrintQueue } from "@/features/produto/hooks/usePrintQueue";
import { testSupabaseConnection } from "@/features/produto/lib/testSupabaseConnection";
import { toast } from "sonner";

export interface Product {
  id: string;
  image: string;
  barcode: string;
  reference: string;
  description: string;
  number: string;
  color: string;
  category: string;
  subcategory: string;
  price: string;
  stock: number;
  createdAt: Date;
  supplier?: string;
  weight?: string;
  goldPlatingMillesimal?: string;
  purchaseCost?: string;
  goldPlatingCost?: string;
  rhodiumPlatingCost?: string;
  silverPlatingCost?: string;
  varnishCost?: string;
  laborCost?: string;
  wholesalePrice?: string;
  nfeData?: string;
  tags?: string[];
}

export interface PrinterSettings {
  printerModel: string;
  exePath: string;
  printerPort: string;
  barcodeType: string;
  labelSize: string;
  enabledFields: {
    supplier: boolean;
    reference: boolean;
    number: boolean;
    weight: boolean;
    goldPlatingMillesimal: boolean;
    purchaseCost: boolean;
    goldPlatingCost: boolean;
    rhodiumPlatingCost: boolean;
    silverPlatingCost: boolean;
    varnishCost: boolean;
    laborCost: boolean;
    wholesalePrice: boolean;
    retailPrice: boolean;
    nfeData: boolean;
  };
}

export interface Supplier {
  id: string;
  nome: string;
  cpfCnpj: string;
  razaoSocial?: string;
  inscricaoEstadual?: string;
  referencia?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  cep?: string;
  pais?: string;
  nomeContato?: string;
  email: string;
  telefone: string;
  telefone2?: string;
  whatsapp?: string;
  observacoes?: string;
}

export interface Reseller {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  tipo: string;
  nivel: string;
}

export interface Category {
  id: string;
  nome: string;
  etiqueta: string;
  etiquetaCustomizada: string;
  produtosVinculados: number;
}

const ProdutoPage = () => {
  const [currentPage, setCurrentPage] = useState("produto-admin-products");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showResellerForm, setShowResellerForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    printerModel: "",
    exePath: "",
    printerPort: "",
    barcodeType: "product-code",
    labelSize: "92x10",
    enabledFields: {
      supplier: false,
      reference: true,
      number: false,
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
  });

  const { products, isLoading: productsLoading, addProduct, updateProduct, deleteProduct, deleteProducts } = useProducts();
  const { suppliers, isLoading: suppliersLoading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { resellers, isLoading: resellersLoading, addReseller, updateReseller, deleteReseller } = useResellers();
  const { categories, isLoading: categoriesLoading, addCategory, updateCategory, deleteCategory } = useCategories();
  const { printQueue, addToPrintQueue, removeFromPrintQueue, clearPrintQueue } = usePrintQueue();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page) {
      setCurrentPage(page);
    }
  }, [window.location.search]);

  useEffect(() => {
    testSupabaseConnection().then((result) => {
      if (result.success) {
        toast.success("✅ " + result.message);
        console.log("Supabase conectado:", result);
      } else {
        toast.error("❌ " + result.message);
        console.error("Erro no Supabase:", result);
      }
    });
  }, []);

  useEffect(() => {
    const handleNavigateToPrinterConfig = () => {
      setShowProductForm(false);
      setShowSupplierForm(false);
      setShowResellerForm(false);
      setShowCategoryForm(false);
      setCurrentPage("printer-config");
    };

    window.addEventListener('navigate-to-printer-config', handleNavigateToPrinterConfig);
    return () => {
      window.removeEventListener('navigate-to-printer-config', handleNavigateToPrinterConfig);
    };
  }, []);

  const handleAddProduct = (product: Omit<Product, "id" | "createdAt">) => {
    addProduct(product);
    setShowProductForm(false);
  };

  const handleImportProducts = (importedProducts: Product[]) => {
    importedProducts.forEach((product) => {
      const { id, createdAt, ...productData } = product;
      addProduct(productData);
    });
  };

  const handleAddSupplier = (supplier: Omit<Supplier, "id">) => {
    addSupplier(supplier);
    setShowSupplierForm(false);
  };

  const handleImportSuppliers = (importedSuppliers: Supplier[]) => {
    importedSuppliers.forEach((supplier) => {
      const { id, ...supplierData } = supplier;
      addSupplier(supplierData);
    });
  };

  const handleAddReseller = (reseller: Omit<Reseller, "id">) => {
    addReseller(reseller);
    setShowResellerForm(false);
  };

  const handleImportResellers = (importedResellers: Reseller[]) => {
    importedResellers.forEach((reseller) => {
      const { id, ...resellerData } = reseller;
      addReseller(resellerData);
    });
  };

  const handleAddCategory = (category: Omit<Category, "id">) => {
    addCategory(category);
    setShowCategoryForm(false);
  };

  const handleImportCategories = (importedCategories: Category[]) => {
    importedCategories.forEach((category) => {
      const { id, ...categoryData } = category;
      addCategory(categoryData);
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
  };

  const handleEditReseller = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setShowResellerForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleUpdateProduct = (product: Product) => {
    updateProduct(product);
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const handleUpdateSupplier = (supplier: Supplier) => {
    updateSupplier(supplier);
    setEditingSupplier(null);
    setShowSupplierForm(false);
  };

  const handleUpdateReseller = (reseller: Reseller) => {
    updateReseller(reseller);
    setEditingReseller(null);
    setShowResellerForm(false);
  };

  const handleUpdateCategory = (category: Category) => {
    updateCategory(category);
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const getPageTitle = () => {
    if (showProductForm) return "Produto Cód.:";
    if (showSupplierForm) return "Cadastro de Fornecedor";
    if (showResellerForm) return "Cadastro de Revendedor";
    if (showCategoryForm) return "Categoria";

    switch (currentPage) {
      case "produto-list":
        return "Listar Produto";
      case "cadastro-fornecedor":
        return "Listar Fornecedores";
      case "cadastro-revendedor":
        return "Listar Revendedores";
      case "produto-category":
        return "Listar Categorias";
      case "produto-print-queue":
        return "Fila de Impressão";
      case "produto-admin-products":
        return "Produtos";
      case "produto-admin-requests":
        return "Solicitações";
      case "dashboard":
        return "Painel de Controle";
      default:
        return "Sistema de Gestão";
    }
  };

  const renderContent = () => {
    if (showProductForm) {
      return (
        <ProductForm
          onBack={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          onSave={editingProduct ? handleUpdateProduct : handleAddProduct}
          initialData={editingProduct}
        />
      );
    }
    if (showSupplierForm) {
      return (
        <SupplierForm
          onBack={() => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
          }}
          onSave={editingSupplier ? handleUpdateSupplier : handleAddSupplier}
          initialData={editingSupplier}
        />
      );
    }
    if (showResellerForm) {
      return (
        <ResellerForm
          onBack={() => {
            setShowResellerForm(false);
            setEditingReseller(null);
          }}
          onSave={editingReseller ? handleUpdateReseller : handleAddReseller}
          initialData={editingReseller}
        />
      );
    }
    if (showCategoryForm) {
      return (
        <CategoryForm
          onBack={() => {
            setShowCategoryForm(false);
            setEditingCategory(null);
          }}
          onSave={editingCategory ? handleUpdateCategory : handleAddCategory}
          initialData={editingCategory}
        />
      );
    }

    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            productsCount={products.length}
            suppliersCount={suppliers.length}
            categoriesCount={categories.length}
          />
        );
      case "produto-list":
        return (
          <ProductList
            products={products}
            printerSettings={printerSettings}
            onAddProduct={() => setShowProductForm(true)}
            onImportProducts={handleImportProducts}
            onEdit={handleEditProduct}
          />
        );
      case "cadastro-fornecedor":
        return (
          <SupplierList
            suppliers={suppliers}
            onAddSupplier={() => setShowSupplierForm(true)}
            onImportSuppliers={handleImportSuppliers}
            onEdit={handleEditSupplier}
          />
        );
      case "cadastro-revendedor":
        return (
          <ResellerList
            resellers={resellers}
            onAddReseller={() => setShowResellerForm(true)}
            onImportResellers={handleImportResellers}
            onEdit={handleEditReseller}
          />
        );
      case "produto-category":
        return (
          <CategoryList
            categories={categories}
            onAddCategory={() => setShowCategoryForm(true)}
            onImportCategories={handleImportCategories}
            onEdit={handleEditCategory}
          />
        );
      case "produto-print-queue":
        return <PrintQueueList />;
      case "produto-admin-products":
        return <AdminProducts />;
      case "produto-admin-requests":
        return <AdminProductRequests />;
      case "printer-config":
        return (
          <PrinterConfig
            settings={printerSettings}
            onUpdateSettings={setPrinterSettings}
          />
        );
      default:
        return (
          <Dashboard
            productsCount={products.length}
            suppliersCount={suppliers.length}
            categoriesCount={categories.length}
          />
        );
    }
  };

  const handleNavigate = (page: string) => {
    setShowProductForm(false);
    setShowSupplierForm(false);
    setShowResellerForm(false);
    setShowCategoryForm(false);
    setEditingProduct(null);
    setEditingSupplier(null);
    setEditingReseller(null);
    setEditingCategory(null);
    setCurrentPage(page);
  };

  const renderMobileContent = () => {
    if (showProductForm) {
      return (
        <MobileProductForm
          onBack={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          onSave={editingProduct ? handleUpdateProduct : handleAddProduct}
          initialData={editingProduct}
        />
      );
    }

    if (showSupplierForm) {
      return (
        <MobileSupplierForm
          onBack={() => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
          }}
          onSave={editingSupplier ? handleUpdateSupplier : handleAddSupplier}
          initialData={editingSupplier}
        />
      );
    }

    if (showResellerForm) {
      return (
        <MobileResellerForm
          onBack={() => {
            setShowResellerForm(false);
            setEditingReseller(null);
          }}
          onSave={editingReseller ? handleUpdateReseller : handleAddReseller}
          initialData={editingReseller}
        />
      );
    }

    if (showCategoryForm) {
      return (
        <MobileCategoryForm
          onBack={() => {
            setShowCategoryForm(false);
            setEditingCategory(null);
          }}
          onSave={editingCategory ? handleUpdateCategory : handleAddCategory}
          initialData={editingCategory}
        />
      );
    }

    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            productsCount={products.length}
            suppliersCount={suppliers.length}
            categoriesCount={categories.length}
          />
        );
      case "produto-list":
        return (
          <MobileProductList
            products={products}
            printerSettings={printerSettings}
            onAddProduct={() => setShowProductForm(true)}
            onImportProducts={handleImportProducts}
            onEdit={handleEditProduct}
          />
        );
      case "cadastro-fornecedor":
        return (
          <MobileSupplierList
            suppliers={suppliers}
            onAddSupplier={() => setShowSupplierForm(true)}
            onImportSuppliers={handleImportSuppliers}
            onEdit={handleEditSupplier}
          />
        );
      case "cadastro-revendedor":
        return (
          <MobileResellerList
            resellers={resellers}
            onAddReseller={() => setShowResellerForm(true)}
            onImportResellers={handleImportResellers}
            onEdit={handleEditReseller}
          />
        );
      case "produto-category":
        return (
          <MobileCategoryList
            categories={categories}
            onAddCategory={() => setShowCategoryForm(true)}
            onImportCategories={handleImportCategories}
            onEdit={handleEditCategory}
          />
        );
      case "produto-print-queue":
        return <MobilePrintQueueList />;
      case "produto-admin-products":
        return <AdminProducts />;
      case "produto-admin-requests":
        return <AdminProductRequests />;
      case "printer-config":
        return (
          <PrinterConfig
            settings={printerSettings}
            onUpdateSettings={setPrinterSettings}
          />
        );
      default:
        return (
          <Dashboard
            productsCount={products.length}
            suppliersCount={suppliers.length}
            categoriesCount={categories.length}
          />
        );
    }
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="flex flex-col h-screen bg-background overflow-hidden md:hidden">
        <div className="flex-1 overflow-hidden">
          {renderMobileContent()}
        </div>
        {!showProductForm && !showSupplierForm && !showResellerForm && !showCategoryForm && (
          <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen bg-background overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProdutoPage;
