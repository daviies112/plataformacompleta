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
  { value: "25x10", label: "25MM x 10MM", widthMm: 25, heightMm: 10 },
  { value: "25x13", label: "25MM x 13MM", widthMm: 25, heightMm: 13 },
  { value: "25x15", label: "25MM x 15MM", widthMm: 25, heightMm: 15 },
  { value: "26x14", label: "26MM x 14MM", widthMm: 26, heightMm: 14 },
  { value: "27x15", label: "27MM x 15MM", widthMm: 27, heightMm: 15 },
  { value: "28x13", label: "28MM x 13MM", widthMm: 28, heightMm: 13 },
  { value: "28x28", label: "28MM x 28MM", widthMm: 28, heightMm: 28 },
  { value: "30x15", label: "30MM x 15MM", widthMm: 30, heightMm: 15 },
  { value: "30x20", label: "30MM x 20MM", widthMm: 30, heightMm: 20 },
  { value: "33x21", label: "33MM x 21MM", widthMm: 33, heightMm: 21 },
  { value: "34x24", label: "34MM x 24MM", widthMm: 34, heightMm: 24 },
  { value: "35x60", label: "35MM x 60MM", widthMm: 35, heightMm: 60 },
  { value: "37x14", label: "37MM x 14MM", widthMm: 37, heightMm: 14 },
  { value: "40x30", label: "40MM x 30MM", widthMm: 40, heightMm: 30 },
  { value: "50x30", label: "50MM x 30MM", widthMm: 50, heightMm: 30 },
  { value: "60x40", label: "60MM x 40MM", widthMm: 60, heightMm: 40 },
  { value: "80x40", label: "80MM x 40MM", widthMm: 80, heightMm: 40 },
  { value: "92x10", label: "92MM x 10MM", widthMm: 92, heightMm: 10 },
  { value: "100x50", label: "100MM x 50MM", widthMm: 100, heightMm: 50 },
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
