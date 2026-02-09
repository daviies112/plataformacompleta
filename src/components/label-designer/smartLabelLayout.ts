import type { Product } from "@/features/produto/pages/ProdutoPage";

export interface LabelLayoutConfig {
  widthMm: number;
  heightMm: number;
}

export interface LayoutElement {
  type: 'text' | 'image' | 'barcode' | 'qrcode';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: string;
  content?: string;
  placeholder?: boolean;
}

export interface SmartLayout {
  elements: LayoutElement[];
  zones: {
    logo: { x: number; y: number; width: number; height: number };
    productName: { x: number; y: number; width: number; height: number };
    price: { x: number; y: number; width: number; height: number };
    reference: { x: number; y: number; width: number; height: number };
    barcode: { x: number; y: number; width: number; height: number };
    notes: { x: number; y: number; width: number; height: number };
  };
}

type LabelSizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';

function categorizeLabelSize(widthMm: number, heightMm: number): LabelSizeCategory {
  const area = widthMm * heightMm;
  
  if (area < 400) return 'tiny';
  if (area < 900) return 'small';
  if (area < 2000) return 'medium';
  if (area < 4000) return 'large';
  return 'xlarge';
}

export function generateSmartLayout(
  config: LabelLayoutConfig,
  product: Product,
  companyLogo?: string
): SmartLayout {
  const { widthMm, heightMm } = config;
  const category = categorizeLabelSize(widthMm, heightMm);
  const isHorizontal = widthMm > heightMm;
  
  const margin = Math.max(1, Math.min(widthMm, heightMm) * 0.05);
  const usableWidth = widthMm - margin * 2;
  const usableHeight = heightMm - margin * 2;
  
  const elements: LayoutElement[] = [];
  let zones: SmartLayout['zones'];
  
  switch (category) {
    case 'tiny':
      zones = generateTinyLayout(margin, usableWidth, usableHeight, widthMm, heightMm);
      break;
    case 'small':
      zones = generateSmallLayout(margin, usableWidth, usableHeight, widthMm, heightMm, isHorizontal);
      break;
    case 'medium':
      zones = generateMediumLayout(margin, usableWidth, usableHeight, widthMm, heightMm, isHorizontal);
      break;
    case 'large':
    case 'xlarge':
    default:
      zones = generateLargeLayout(margin, usableWidth, usableHeight, widthMm, heightMm, isHorizontal);
      break;
  }
  
  if (product.description) {
    const nameFontSize = calculateFontSize(category, 'name');
    elements.push({
      type: 'text',
      id: 'product-name',
      x: zones.productName.x,
      y: zones.productName.y,
      width: zones.productName.width,
      height: zones.productName.height,
      fontSize: nameFontSize,
      fontWeight: 'bold',
      content: product.description,
    });
  }
  
  if (product.price) {
    const priceFontSize = calculateFontSize(category, 'price');
    const priceStr = product.price.startsWith('R$') ? product.price : `R$ ${product.price}`;
    elements.push({
      type: 'text',
      id: 'product-price',
      x: zones.price.x,
      y: zones.price.y,
      width: zones.price.width,
      height: zones.price.height,
      fontSize: priceFontSize,
      fontWeight: 'bold',
      content: priceStr,
    });
  }
  
  if (product.reference && category !== 'tiny') {
    const refFontSize = calculateFontSize(category, 'reference');
    elements.push({
      type: 'text',
      id: 'product-reference',
      x: zones.reference.x,
      y: zones.reference.y,
      width: zones.reference.width,
      height: zones.reference.height,
      fontSize: refFontSize,
      fontWeight: 'normal',
      content: `Ref: ${product.reference}`,
    });
  }
  
  if (product.barcode && category !== 'tiny') {
    elements.push({
      type: 'barcode',
      id: 'product-barcode',
      x: zones.barcode.x,
      y: zones.barcode.y,
      width: zones.barcode.width,
      height: zones.barcode.height,
      content: product.barcode,
    });
  }
  
  if (zones.logo.width > 0 && zones.logo.height > 0) {
    elements.push({
      type: 'image',
      id: 'company-logo',
      x: zones.logo.x,
      y: zones.logo.y,
      width: zones.logo.width,
      height: zones.logo.height,
      placeholder: !companyLogo,
      content: companyLogo,
    });
  }
  
  if (zones.notes.width > 0 && zones.notes.height > 0 && category !== 'tiny' && category !== 'small') {
    const notesFontSize = calculateFontSize(category, 'notes');
    elements.push({
      type: 'text',
      id: 'notes',
      x: zones.notes.x,
      y: zones.notes.y,
      width: zones.notes.width,
      height: zones.notes.height,
      fontSize: notesFontSize,
      fontWeight: 'normal',
      content: '',
      placeholder: true,
    });
  }
  
  return { elements, zones };
}

function calculateFontSize(category: LabelSizeCategory, elementType: 'name' | 'price' | 'reference' | 'notes'): number {
  const sizeMap: Record<LabelSizeCategory, Record<string, number>> = {
    tiny: { name: 6, price: 7, reference: 5, notes: 5 },
    small: { name: 8, price: 10, reference: 6, notes: 6 },
    medium: { name: 10, price: 12, reference: 8, notes: 7 },
    large: { name: 12, price: 14, reference: 9, notes: 8 },
    xlarge: { name: 14, price: 16, reference: 10, notes: 9 },
  };
  
  return sizeMap[category][elementType];
}

function generateTinyLayout(
  margin: number,
  usableWidth: number,
  usableHeight: number,
  widthMm: number,
  heightMm: number
): SmartLayout['zones'] {
  const nameHeight = usableHeight * 0.5;
  const priceHeight = usableHeight * 0.5;
  
  return {
    logo: { x: 0, y: 0, width: 0, height: 0 },
    productName: {
      x: margin,
      y: margin,
      width: usableWidth,
      height: nameHeight,
    },
    price: {
      x: margin,
      y: margin + nameHeight,
      width: usableWidth,
      height: priceHeight,
    },
    reference: { x: 0, y: 0, width: 0, height: 0 },
    barcode: { x: 0, y: 0, width: 0, height: 0 },
    notes: { x: 0, y: 0, width: 0, height: 0 },
  };
}

function generateSmallLayout(
  margin: number,
  usableWidth: number,
  usableHeight: number,
  widthMm: number,
  heightMm: number,
  isHorizontal: boolean
): SmartLayout['zones'] {
  if (isHorizontal) {
    const leftWidth = usableWidth * 0.65;
    const rightWidth = usableWidth * 0.35;
    const nameHeight = usableHeight * 0.35;
    const priceHeight = usableHeight * 0.35;
    const refHeight = usableHeight * 0.3;
    
    return {
      logo: { x: 0, y: 0, width: 0, height: 0 },
      productName: {
        x: margin,
        y: margin,
        width: leftWidth,
        height: nameHeight,
      },
      price: {
        x: margin,
        y: margin + nameHeight,
        width: leftWidth,
        height: priceHeight,
      },
      reference: {
        x: margin,
        y: margin + nameHeight + priceHeight,
        width: leftWidth,
        height: refHeight,
      },
      barcode: {
        x: margin + leftWidth + 1,
        y: margin,
        width: rightWidth - 1,
        height: usableHeight,
      },
      notes: { x: 0, y: 0, width: 0, height: 0 },
    };
  } else {
    const nameHeight = usableHeight * 0.3;
    const priceHeight = usableHeight * 0.25;
    const barcodeHeight = usableHeight * 0.35;
    const refHeight = usableHeight * 0.1;
    
    return {
      logo: { x: 0, y: 0, width: 0, height: 0 },
      productName: {
        x: margin,
        y: margin,
        width: usableWidth,
        height: nameHeight,
      },
      price: {
        x: margin,
        y: margin + nameHeight,
        width: usableWidth,
        height: priceHeight,
      },
      reference: {
        x: margin,
        y: margin + nameHeight + priceHeight,
        width: usableWidth,
        height: refHeight,
      },
      barcode: {
        x: margin,
        y: margin + nameHeight + priceHeight + refHeight,
        width: usableWidth,
        height: barcodeHeight,
      },
      notes: { x: 0, y: 0, width: 0, height: 0 },
    };
  }
}

function generateMediumLayout(
  margin: number,
  usableWidth: number,
  usableHeight: number,
  widthMm: number,
  heightMm: number,
  isHorizontal: boolean
): SmartLayout['zones'] {
  if (isHorizontal) {
    const logoWidth = Math.min(usableWidth * 0.2, 15);
    const logoHeight = Math.min(usableHeight * 0.4, 12);
    const contentWidth = usableWidth - logoWidth - 2;
    const barcodeWidth = usableWidth * 0.35;
    
    const nameHeight = usableHeight * 0.3;
    const priceHeight = usableHeight * 0.25;
    const refHeight = usableHeight * 0.2;
    const barcodeHeight = usableHeight * 0.25;
    
    return {
      logo: {
        x: margin,
        y: margin,
        width: logoWidth,
        height: logoHeight,
      },
      productName: {
        x: margin + logoWidth + 2,
        y: margin,
        width: contentWidth - barcodeWidth,
        height: nameHeight,
      },
      price: {
        x: margin + logoWidth + 2,
        y: margin + nameHeight,
        width: contentWidth - barcodeWidth,
        height: priceHeight,
      },
      reference: {
        x: margin,
        y: margin + logoHeight + 1,
        width: usableWidth - barcodeWidth - 2,
        height: refHeight,
      },
      barcode: {
        x: widthMm - margin - barcodeWidth,
        y: margin,
        width: barcodeWidth,
        height: usableHeight * 0.6,
      },
      notes: {
        x: margin,
        y: heightMm - margin - barcodeHeight,
        width: usableWidth - barcodeWidth - 2,
        height: barcodeHeight,
      },
    };
  } else {
    const logoSize = Math.min(usableWidth * 0.25, 10);
    const nameHeight = usableHeight * 0.2;
    const priceHeight = usableHeight * 0.18;
    const refHeight = usableHeight * 0.12;
    const barcodeHeight = usableHeight * 0.25;
    const notesHeight = usableHeight * 0.15;
    
    return {
      logo: {
        x: margin,
        y: margin,
        width: logoSize,
        height: logoSize,
      },
      productName: {
        x: margin + logoSize + 2,
        y: margin,
        width: usableWidth - logoSize - 2,
        height: nameHeight,
      },
      price: {
        x: margin,
        y: margin + nameHeight + 1,
        width: usableWidth,
        height: priceHeight,
      },
      reference: {
        x: margin,
        y: margin + nameHeight + priceHeight + 2,
        width: usableWidth,
        height: refHeight,
      },
      barcode: {
        x: margin,
        y: margin + nameHeight + priceHeight + refHeight + 3,
        width: usableWidth,
        height: barcodeHeight,
      },
      notes: {
        x: margin,
        y: heightMm - margin - notesHeight,
        width: usableWidth,
        height: notesHeight,
      },
    };
  }
}

function generateLargeLayout(
  margin: number,
  usableWidth: number,
  usableHeight: number,
  widthMm: number,
  heightMm: number,
  isHorizontal: boolean
): SmartLayout['zones'] {
  if (isHorizontal) {
    const logoWidth = Math.min(usableWidth * 0.18, 20);
    const logoHeight = Math.min(usableHeight * 0.35, 15);
    const barcodeWidth = usableWidth * 0.3;
    const barcodeHeight = usableHeight * 0.5;
    
    const nameHeight = usableHeight * 0.25;
    const priceHeight = usableHeight * 0.22;
    const refHeight = usableHeight * 0.15;
    const notesHeight = usableHeight * 0.3;
    
    const contentStartX = margin + logoWidth + 3;
    const contentWidth = usableWidth - logoWidth - barcodeWidth - 6;
    
    return {
      logo: {
        x: margin,
        y: margin,
        width: logoWidth,
        height: logoHeight,
      },
      productName: {
        x: contentStartX,
        y: margin,
        width: contentWidth,
        height: nameHeight,
      },
      price: {
        x: contentStartX,
        y: margin + nameHeight + 1,
        width: contentWidth,
        height: priceHeight,
      },
      reference: {
        x: margin,
        y: margin + logoHeight + 2,
        width: logoWidth + contentWidth + 3,
        height: refHeight,
      },
      barcode: {
        x: widthMm - margin - barcodeWidth,
        y: margin,
        width: barcodeWidth,
        height: barcodeHeight,
      },
      notes: {
        x: margin,
        y: heightMm - margin - notesHeight,
        width: usableWidth - barcodeWidth - 3,
        height: notesHeight,
      },
    };
  } else {
    const logoSize = Math.min(usableWidth * 0.22, 18);
    const nameHeight = usableHeight * 0.15;
    const priceHeight = usableHeight * 0.12;
    const refHeight = usableHeight * 0.1;
    const barcodeHeight = usableHeight * 0.2;
    const notesHeight = usableHeight * 0.15;
    
    return {
      logo: {
        x: margin,
        y: margin,
        width: logoSize,
        height: logoSize,
      },
      productName: {
        x: margin + logoSize + 3,
        y: margin,
        width: usableWidth - logoSize - 3,
        height: nameHeight,
      },
      price: {
        x: margin,
        y: margin + Math.max(logoSize, nameHeight) + 2,
        width: usableWidth,
        height: priceHeight,
      },
      reference: {
        x: margin,
        y: margin + Math.max(logoSize, nameHeight) + priceHeight + 4,
        width: usableWidth,
        height: refHeight,
      },
      barcode: {
        x: margin + (usableWidth - usableWidth * 0.7) / 2,
        y: margin + Math.max(logoSize, nameHeight) + priceHeight + refHeight + 6,
        width: usableWidth * 0.7,
        height: barcodeHeight,
      },
      notes: {
        x: margin,
        y: heightMm - margin - notesHeight,
        width: usableWidth,
        height: notesHeight,
      },
    };
  }
}

export function getLayoutPreviewDescription(category: LabelSizeCategory): string {
  const descriptions: Record<LabelSizeCategory, string> = {
    tiny: 'Layout compacto: Nome + Preço',
    small: 'Layout básico: Nome, Preço, Ref, Código de barras',
    medium: 'Layout padrão: Logo, Nome, Preço, Ref, Código de barras, Notas',
    large: 'Layout completo: Todos os elementos com espaçamento confortável',
    xlarge: 'Layout premium: Todos os elementos com visual elegante',
  };
  
  return descriptions[category];
}
