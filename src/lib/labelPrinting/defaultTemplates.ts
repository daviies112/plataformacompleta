/**
 * Default Label Templates
 * 
 * Pre-built templates for common label types
 */

export interface LabelTemplate {
  name: string;
  description?: string;
  widthMm: number;
  heightMm: number;
  category?: string;
  elements: any[];  // Fabric.js objects
}

export const defaultTemplates: LabelTemplate[] = [
  {
    name: "Brinco - Pequena",
    description: "Template para etiqueta de brinco pequeno",
    widthMm: 40,
    heightMm: 30,
    category: "semijoias",
    elements: [
      {
        type: "text",
        text: "Brinco Dourado",
        left: 10,
        top: 10,
        fontSize: 14,
        fontFamily: "Arial",
        fill: "#000000"
      },
      {
        type: "text",
        text: "R$ 49,90",
        left: 10,
        top: 40,
        fontSize: 12,
        fontFamily: "Arial",
        fill: "#000000"
      }
    ]
  },
  {
    name: "Anel - Pequeno",
    description: "Template para etiqueta de anel pequeno",
    widthMm: 40,
    heightMm: 30,
    category: "semijoias",
    elements: [
      {
        type: "text",
        text: "Anel Prata",
        left: 10,
        top: 10,
        fontSize: 14,
        fontFamily: "Arial",
        fill: "#000000"
      },
      {
        type: "text",
        text: "R$ 79,90",
        left: 10,
        top: 40,
        fontSize: 12,
        fontFamily: "Arial",
        fill: "#000000"
      }
    ]
  },
  {
    name: "Produto com Barcode",
    description: "Template com código de barras",
    widthMm: 60,
    heightMm: 40,
    category: "produtos",
    elements: [
      {
        type: "text",
        text: "Nome do Produto",
        left: 20,
        top: 20,
        fontSize: 16,
        fontFamily: "Arial",
        fill: "#000000"
      },
      {
        type: "text",
        text: "SKU: 000001",
        left: 20,
        top: 45,
        fontSize: 12,
        fontFamily: "Arial",
        fill: "#666666"
      },
      {
        type: "text",
        text: "R$ 99,90",
        left: 20,
        top: 65,
        fontSize: 14,
        fontFamily: "Arial",
        fontWeight: "bold",
        fill: "#000000"
      }
    ]
  },
  {
    name: "QR Code + Produto",
    description: "Template com QR code para rastreamento",
    widthMm: 60,
    heightMm: 40,
    category: "produtos",
    elements: [
      {
        type: "text",
        text: "Produto Premium",
        left: 20,
        top: 20,
        fontSize: 16,
        fontFamily: "Arial",
        fill: "#000000"
      },
      {
        type: "text",
        text: "R$ 149,90",
        left: 20,
        top: 45,
        fontSize: 14,
        fontFamily: "Arial",
        fontWeight: "bold",
        fill: "#000000"
      }
    ]
  },
  {
    name: "Etiqueta Simples",
    description: "Template minimalista apenas com texto",
    widthMm: 30,
    heightMm: 20,
    category: "basico",
    elements: [
      {
        type: "text",
        text: "Item",
        left: 10,
        top: 10,
        fontSize: 12,
        fontFamily: "Arial",
        fill: "#000000"
      },
      {
        type: "text",
        text: "R$ 29,90",
        left: 10,
        top: 30,
        fontSize: 10,
        fontFamily: "Arial",
        fill: "#000000"
      }
    ]
  }
];

export function getTemplatesByCategory(category: string): LabelTemplate[] {
  return defaultTemplates.filter(t => t.category === category);
}

export function getTemplateByName(name: string): LabelTemplate | undefined {
  return defaultTemplates.find(t => t.name === name);
}

export default {
  defaultTemplates,
  getTemplatesByCategory,
  getTemplateByName
};
