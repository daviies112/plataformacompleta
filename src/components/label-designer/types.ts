import * as fabricModule from 'fabric';
const fabric = (fabricModule as any).fabric || fabricModule;

export interface LabelTemplate {
  id?: number;
  tenantId?: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  widthMm: number;
  heightMm: number;
  designData: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LabelElement {
  type: 'text' | 'image' | 'barcode' | 'qrcode';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  value?: string;
  data?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fill?: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
}

export interface CanvasEditorProps {
  widthMm: number;
  heightMm: number;
  onSelectionChange?: (object: fabric.Object | null) => void;
  onCanvasChange?: () => void;
}

export interface CanvasEditorRef {
  canvas: fabric.Canvas | null;
  addText: () => void;
  addTextWithContent: (content: string, options?: { 
    x?: number; 
    y?: number; 
    width?: number;
    fontSize?: number; 
    fontWeight?: string;
    fontFamily?: string;
    fill?: string;
  }) => void;
  addImage: (file: File) => void;
  addImageAtPosition: (dataUrl: string, options: { x: number; y: number; width: number; height: number }) => Promise<void>;
  addLogoPlaceholder: (options: { x: number; y: number; width: number; height: number }) => void;
  addBarcode: (text?: string, options?: { x?: number; y?: number; width?: number; height?: number }) => Promise<void>;
  addQRCode: (text?: string, options?: { x?: number; y?: number; size?: number }) => Promise<void>;
  loadSmartLayout: (layout: any, companyLogoUrl?: string) => Promise<void>;
  deleteSelected: () => void;
  clearCanvas: () => void;
  getElements: () => LabelElement[];
  loadDesignData: (data: any) => void;
  getDesignData: () => any;
}

export interface ExportOptions {
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
}
