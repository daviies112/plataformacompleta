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

export interface PrintQueueItem {
  id: string;
  product: Product;
  quantity: number;
  parcelas: number;
}
