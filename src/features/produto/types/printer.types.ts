export type QZConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type PrintFormat = 'zpl' | 'epl' | 'escpos' | 'pdf';

export type BarcodeType = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';

export interface PrinterEnabledFields {
  description: boolean;
  barcode: boolean;
  price: boolean;
  reference: boolean;
  supplier: boolean;
  weight: boolean;
  qrcode: boolean;
  number: boolean;
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
}

export interface PrinterConfig {
  id: number;
  tenantId: string;
  printerName: string;
  printerModel: string | null;
  printerType: string;
  connectionType: string;
  printerPort: string | null;
  labelWidthMm: string;
  labelHeightMm: string;
  labelGapMm: string;
  printFormat: PrintFormat;
  dpi: number;
  barcodeType: BarcodeType;
  enabledFields: PrinterEnabledFields;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrinterConfig {
  printerName: string;
  printerModel?: string;
  printerType?: string;
  connectionType?: string;
  printerPort?: string;
  labelWidthMm?: string;
  labelHeightMm?: string;
  labelGapMm?: string;
  printFormat?: PrintFormat;
  dpi?: number;
  barcodeType?: BarcodeType;
  enabledFields?: Partial<PrinterEnabledFields>;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdatePrinterConfig extends Partial<CreatePrinterConfig> {
  id: number;
}

export interface PrinterConfigApiResponse {
  success: boolean;
  data?: PrinterConfig | PrinterConfig[] | null;
  error?: string;
  message?: string;
}

export interface ZPLElement {
  type: 'text' | 'barcode' | 'qrcode' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  value?: string;
  data?: string;
  fontSize?: number;
  fontFamily?: string;
  barcodeType?: BarcodeType;
}

export interface GenerateZPLRequest {
  widthMm: number;
  heightMm: number;
  dpi?: number; // DPI da impressora (152, 203, 300, 600) - default 203
  elements: ZPLElement[];
}

export interface GenerateZPLResponse {
  success: boolean;
  zpl?: string;
  error?: string;
  info?: {
    widthMm: number;
    heightMm: number;
    elementCount: number;
    dpi: number;
    dotsPerMm?: number;
  };
}

export const DEFAULT_ENABLED_FIELDS: PrinterEnabledFields = {
  description: true,
  barcode: true,
  price: true,
  reference: false,
  supplier: false,
  weight: false,
  qrcode: false,
  number: false,
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
};

export const LABEL_SIZES = [
  { value: "92MMX10MM", label: "01 - Modelo fino (92mm x 10mm)", widthMm: 92, heightMm: 10 },
  { value: "90MMX12MM", label: "02 - Modelo fino (90mm x 12mm)", widthMm: 90, heightMm: 12 },
  { value: "25MMx13MM", label: "04 - Modelo retangular (25mm x 13mm)", widthMm: 25, heightMm: 13 },
  { value: "60x40", label: "60mm x 40mm (Padrão)", widthMm: 60, heightMm: 40 },
  { value: "100x150", label: "100mm x 150mm (Mercado Livre)", widthMm: 100, heightMm: 150 },
  { value: "25MMx10MMx2", label: "Retangular (25mm x 10mm x 2 colunas)", widthMm: 52, heightMm: 10 },
  { value: "25MMx15MMx2", label: "Retangular (25mm x 15mm x 2 colunas)", widthMm: 52, heightMm: 15 },
  { value: "26MMx14MM", label: "Retangular (26mm x 14mm)", widthMm: 26, heightMm: 14 },
  { value: "28MMx28MM", label: "Quadrada (28mm x 28mm)", widthMm: 28, heightMm: 28 },
  { value: "29MMx11MMx2", label: "Retangular (29mm x 11mm x 2 colunas)", widthMm: 60, heightMm: 11 },
  { value: "30MMx20MM", label: "Retangular (30mm x 20mm)", widthMm: 30, heightMm: 20 },
  { value: "33MMx21MM", label: "Retangular (33mm x 21mm)", widthMm: 33, heightMm: 21 },
  { value: "34MMx24MM", label: "Retangular (34mm x 24mm)", widthMm: 34, heightMm: 24 },
  { value: "35MMx60MM", label: "Gargantilha (35mm x 60mm)", widthMm: 35, heightMm: 60 },
  { value: "37MMx14MM", label: "Retangular (37mm x 14mm)", widthMm: 37, heightMm: 14 },
  { value: "SLP_JEWEL", label: "SLP-JEWEL (Smart Label)", widthMm: 54, heightMm: 11 },
  { value: "A4", label: "A4 (Folha Inteira - Pimaco)", widthMm: 210, heightMm: 297 },
] as const;

export const BARCODE_TYPES = [
  { value: "CODE128", label: "Code 128" },
  { value: "CODE39", label: "Code 39" },
  { value: "EAN13", label: "EAN-13" },
  { value: "UPC", label: "UPC-A" },
] as const;

export const PRINT_FORMATS = [
  { value: "zpl", label: "ZPL (Zebra)" },
  { value: "epl", label: "EPL (Eltron)" },
  { value: "escpos", label: "ESC/POS" },
  { value: "pdf", label: "PDF" },
] as const;

export const PRINTER_TYPES = [
  { value: "thermal", label: "Impressora Térmica" },
  { value: "laser", label: "Impressora Laser" },
  { value: "inkjet", label: "Impressora Jato de Tinta" },
] as const;
