/**
 * ZPL (Zebra Programming Language) Converter
 * 
 * ⚠️ IMPORTANT: This is a CLIENT-SIDE HELPER for preview/offline use only.
 * For production ZPL generation, ALWAYS use the backend API:
 *   POST /api/label-designer/generate-zpl
 * 
 * The backend is the authoritative ZPL generator with full validation,
 * error handling, and feature parity with the label designer.
 * 
 * Converts label elements to ZPL code for Zebra thermal printers
 * 
 * Specifications:
 * - 203 DPI (8 dots per mm)
 * - Commands: ^XA (start), ^XZ (end), ^FO (field origin), ^FD (field data)
 * - Barcodes: ^BCN (CODE128), ^BQN (QR code)
 */

export interface ZPLElement {
  type: 'text' | 'barcode' | 'qrcode' | 'image';
  x: number;  // position in mm
  y: number;  // position in mm
  width?: number;
  height?: number;
  text?: string;
  data?: string;
  fontSize?: number;
  barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
}

export interface ZPLOptions {
  widthMm: number;
  heightMm: number;
  dpi?: number;  // default 203 DPI (8 dots/mm)
}

/**
 * Convert millimeters to dots based on DPI
 */
function mmToDots(mm: number, dpi: number = 203): number {
  const dotsPerMm = dpi / 25.4;
  return Math.round(mm * dotsPerMm);
}

/**
 * Escape ZPL special characters
 */
function escapeZPL(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/\^/g, '\\^')
    .replace(/~/g, '\\~')
    .replace(/\n/g, '\\&');
}

/**
 * Generate ZPL code from label elements
 */
export function generateZPL(elements: ZPLElement[], options: ZPLOptions): string {
  const { widthMm, heightMm, dpi = 203 } = options;
  const zpl: string[] = [];

  // Start label
  zpl.push('^XA');

  // Set label width (in dots)
  const widthDots = mmToDots(widthMm, dpi);
  zpl.push(`^PW${widthDots}`);

  // Set label length (in dots)
  const heightDots = mmToDots(heightMm, dpi);
  zpl.push(`^LL${heightDots}`);

  // Process each element
  for (const element of elements) {
    const xDots = mmToDots(element.x, dpi);
    const yDots = mmToDots(element.y, dpi);

    if (element.type === 'text') {
      // Text element
      // ^FO = Field Origin (position)
      // ^A0N = Font (0=default, N=normal orientation)
      // ^FD = Field Data
      // ^FS = Field Separator (end)
      
      const fontSize = element.fontSize || 12;
      const fontHeight = Math.round(fontSize * 1.5); // approximate height in dots
      
      zpl.push(`^FO${xDots},${yDots}`);
      zpl.push(`^A0N,${fontHeight},${fontHeight}`);
      zpl.push(`^FD${escapeZPL(element.text || '')}^FS`);

    } else if (element.type === 'barcode') {
      // Barcode element (CODE128 by default)
      // ^FO = Field Origin
      // ^BY = Bar Width (default 2)
      // ^BCN = CODE128 barcode
      // ^FD = Field Data
      
      const heightDots = element.height ? mmToDots(element.height, dpi) : 60;
      
      zpl.push(`^FO${xDots},${yDots}`);
      zpl.push(`^BY2`);
      
      if (element.barcodeType === 'CODE39') {
        zpl.push(`^B3N,N,${heightDots},Y,N`);
      } else if (element.barcodeType === 'EAN13') {
        zpl.push(`^BEN,${heightDots},Y,N`);
      } else {
        // CODE128 (default)
        zpl.push(`^BCN,${heightDots},Y,N,N`);
      }
      
      zpl.push(`^FD${escapeZPL(element.data || element.text || '')}^FS`);

    } else if (element.type === 'qrcode') {
      // QR Code element
      // ^FO = Field Origin
      // ^BQN = QR code
      // ^FDLA = Field Data (LA prefix for encoding)
      
      const model = 2; // QR model
      const magnification = 6; // size factor
      
      zpl.push(`^FO${xDots},${yDots}`);
      zpl.push(`^BQN,${model},${magnification}`);
      zpl.push(`^FDLA,${escapeZPL(element.data || element.text || '')}^FS`);

    } else if (element.type === 'image') {
      // Image conversion to ZPL is complex and requires GRF format
      // This is a placeholder - implement full conversion if needed
      zpl.push(`^FO${xDots},${yDots}`);
      zpl.push(`^FX Image conversion not implemented^FS`);
    }
  }

  // End label
  zpl.push('^XZ');

  return zpl.join('\n');
}

/**
 * Generate simple ZPL for testing
 */
export function generateTestZPL(text: string = 'Test Label'): string {
  return generateZPL(
    [
      { type: 'text', x: 10, y: 10, text: text, fontSize: 20 },
      { type: 'text', x: 10, y: 20, text: 'Powered by ExecutiveAI Pro', fontSize: 10 }
    ],
    { widthMm: 60, heightMm: 40 }
  );
}

export default {
  generateZPL,
  generateTestZPL,
  mmToDots,
  escapeZPL
};
