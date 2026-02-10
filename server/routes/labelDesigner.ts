import express, { Request, Response } from "express";
import PDFDocument from "pdfkit";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import bwipjs from "bwip-js";
import { db } from "../db.js";
import { labelTemplates, insertLabelTemplateSchema, updateLabelTemplateSchema } from "../../shared/db-schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = express.Router();

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Schema for ZPL element validation - accepts full Fabric.js element contract
// Uses coercion for numeric fields that may arrive as strings from the designer
const zplElementSchema = z.object({
  // Core identification
  type: z.enum(['text', 'barcode', 'qrcode', 'image']),
  
  // Position and dimensions (coerce strings to numbers)
  x: z.coerce.number(),
  y: z.coerce.number(),
  left: z.coerce.number().optional(),
  top: z.coerce.number().optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  
  // Content
  text: z.string().optional(),
  value: z.string().optional(),
  data: z.string().optional(),
  
  // Typography (all optional for flexibility, with coercion)
  fontSize: z.coerce.number().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.union([z.string(), z.coerce.number()]).optional(),
  fontStyle: z.string().optional(),
  lineHeight: z.coerce.number().optional(),
  charSpacing: z.coerce.number().optional(),
  textAlign: z.string().optional(),
  
  // Visual styling (coerce numeric values)
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.coerce.number().optional(),
  opacity: z.coerce.number().optional(),
  
  // Transform properties (coerce all numeric transforms)
  rotation: z.coerce.number().optional(),
  angle: z.coerce.number().optional(),
  scaleX: z.coerce.number().optional(),
  scaleY: z.coerce.number().optional(),
  skewX: z.coerce.number().optional(),
  skewY: z.coerce.number().optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  
  // Barcode specific (with coercion)
  barcodeType: z.enum(['CODE128', 'CODE39', 'EAN13', 'UPC']).optional(),
  barcodeWidth: z.coerce.number().optional(),
  
  // Allow any additional Fabric.js properties
}).passthrough();

// Schema for generate-zpl endpoint payload (with coercion for numeric dimensions)
const generateZplSchema = z.object({
  widthMm: z.coerce.number().min(1).max(500),
  heightMm: z.coerce.number().min(1).max(500),
  dpi: z.coerce.number().min(100).max(600).default(203), // DPI da impressora (152, 203, 300, 600)
  elements: z.array(zplElementSchema).min(0).max(100) // max 100 elements per label
});

// Helper to get tenantId from request (session or temp for dev)
function getTenantId(req: Request): string | null {
  // Try to get from session first
  if (req.session?.tenantId) {
    return req.session.tenantId;
  }
  
  // Fallback to userId as tenantId (common pattern in this app)
  if (req.session?.userId) {
    return req.session.userId;
  }
  
  // Development mode: allow temporary tenant
  if (process.env.NODE_ENV === 'development') {
    return 'dev-tenant-default';
  }
  
  return null;
}

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), "label-designer", "uploads");
const tmpDir = path.join(process.cwd(), "label-designer", "tmp");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// POST /api/label-designer/upload-image
router.post("/upload-image", upload.single("image"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageUrl = `/label-designer/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      imageUrl,
      filename: req.file.filename 
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// ============================================================================
// BARCODE & QR CODE GENERATION (using bwip-js)
// Universal solution - works without QZ Tray or external software
// ============================================================================

// POST /api/label-designer/generate-barcode
router.post("/generate-barcode", async (req: Request, res: Response) => {
  try {
    const { code, type = 'code128' } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const png = await bwipjs.toBuffer({
      bcid: type,
      text: String(code),
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center'
    });

    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (error) {
    console.error('Error generating barcode:', error);
    res.status(500).json({ error: 'Failed to generate barcode' });
  }
});

// POST /api/label-designer/generate-qrcode
router.post("/generate-qrcode", async (req: Request, res: Response) => {
  try {
    const { data, size = 20 } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: "Data is required" });
    }

    const png = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: String(data),
      scale: 3,
      height: size,
      width: size
    });

    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (error) {
    console.error('Error generating QR Code:', error);
    res.status(500).json({ error: 'Failed to generate QR Code' });
  }
});

// POST /api/label-designer/generate-barcode-base64
router.post("/generate-barcode-base64", async (req: Request, res: Response) => {
  try {
    const { code, type = 'code128', scale = 3, height = 10 } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const png = await bwipjs.toBuffer({
      bcid: type,
      text: String(code),
      scale,
      height,
      includetext: true,
      textxalign: 'center'
    });

    const base64 = `data:image/png;base64,${png.toString('base64')}`;
    res.json({ success: true, imageData: base64 });
  } catch (error) {
    console.error('Error generating barcode base64:', error);
    res.status(500).json({ error: 'Failed to generate barcode' });
  }
});

// POST /api/label-designer/generate-qrcode-base64
router.post("/generate-qrcode-base64", async (req: Request, res: Response) => {
  try {
    const { data, size = 20, scale = 3 } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: "Data is required" });
    }

    const png = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: String(data),
      scale,
      height: size,
      width: size
    });

    const base64 = `data:image/png;base64,${png.toString('base64')}`;
    res.json({ success: true, imageData: base64 });
  } catch (error) {
    console.error('Error generating QR Code base64:', error);
    res.status(500).json({ error: 'Failed to generate QR Code' });
  }
});

// Helper function to generate barcode using bwip-js
async function generateBarcodeBuffer(code: string, type: string = 'code128', height: number = 10): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: type,
    text: String(code),
    scale: 3,
    height: height,
    includetext: true,
    textxalign: 'center'
  });
}

// Helper function to generate QR code using bwip-js
async function generateQRCodeBuffer(data: string, size: number = 20): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'qrcode',
    text: String(data),
    scale: 3,
    height: size,
    width: size
  });
}

// POST /api/label-designer/generate-pdf
router.post("/generate-pdf", async (req: Request, res: Response) => {
  try {
    const { widthMm, heightMm, elements } = req.body;

    if (!widthMm || !heightMm || !elements) {
      return res.status(400).json({ error: "Missing required fields: widthMm, heightMm, elements" });
    }

    // Convert mm to points (1mm = 2.834645669 points)
    const MM_TO_POINTS = 2.834645669;
    const widthPoints = widthMm * MM_TO_POINTS;
    const heightPoints = heightMm * MM_TO_POINTS;

    // Create PDF with exact dimensions, no margins
    const doc = new PDFDocument({
      size: [widthPoints, heightPoints],
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="label-${widthMm}x${heightMm}mm.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Process each element
    // Frontend sends positions in mm, convert directly to points
    // 1mm = 2.834645669 points
    
    for (const element of elements) {
      // Convert mm positions directly to points
      const xPoints = element.x * MM_TO_POINTS;
      const yPoints = element.y * MM_TO_POINTS;
      const widthElementPoints = element.width ? element.width * MM_TO_POINTS : undefined;
      const heightElementPoints = element.height ? element.height * MM_TO_POINTS : undefined;

      if (element.type === "text") {
        // Draw text
        const fontSize = element.fontSize || 12;
        doc.fontSize(fontSize);
        
        if (element.fontFamily) {
          try {
            doc.font(element.fontFamily);
          } catch (e) {
            // Fallback to default font if custom font not available
            doc.font('Helvetica');
          }
        }

        if (element.fill) {
          doc.fillColor(element.fill);
        }

        doc.text(element.text || "", xPoints, yPoints, {
          width: widthElementPoints,
          lineBreak: element.lineBreak !== false
        });
      } else if (element.type === "image") {
        // Draw image
        try {
          if (element.data && element.data.startsWith('data:image')) {
            // Handle base64 images
            const base64Data = element.data.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            
            doc.image(buffer, xPoints, yPoints, {
              width: widthElementPoints,
              height: heightElementPoints
            });
          } else if (element.data) {
            // Handle file path images
            const imagePath = path.join(process.cwd(), element.data.replace(/^\//, ''));
            
            if (fs.existsSync(imagePath)) {
              doc.image(imagePath, xPoints, yPoints, {
                width: widthElementPoints,
                height: heightElementPoints
              });
            }
          }
        } catch (error) {
          console.error("Error adding image to PDF:", error);
        }
      } else if (element.type === "barcode") {
        // Generate barcode server-side using bwip-js or use pre-rendered base64
        try {
          let buffer: Buffer | null = null;
          
          if (element.data && element.data.startsWith('data:image')) {
            // Use pre-rendered base64 image from client
            const base64Data = element.data.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
          } else {
            // Generate barcode server-side with bwip-js
            const code = element.value || element.text || element.content || element.data || '';
            const barcodeType = element.barcodeType?.toLowerCase() || 'code128';
            const barcodeHeight = element.height || 10;
            
            // Only generate barcode if code is not empty
            if (code && code.trim() !== '') {
              buffer = await generateBarcodeBuffer(code, barcodeType, barcodeHeight);
            }
          }
          
          if (buffer) {
            doc.image(buffer, xPoints, yPoints, {
              width: widthElementPoints,
              height: heightElementPoints
            });
          }
        } catch (error) {
          console.error("Error adding barcode to PDF:", error);
        }
      } else if (element.type === "qrcode") {
        // Generate QR code server-side using bwip-js or use pre-rendered base64
        try {
          let buffer: Buffer | null = null;
          
          if (element.data && element.data.startsWith('data:image')) {
            // Use pre-rendered base64 image from client
            const base64Data = element.data.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
          } else {
            // Generate QR code server-side with bwip-js
            const data = element.value || element.text || element.content || element.data || '';
            const size = element.size || element.width || 20;
            
            // Only generate QR code if data is not empty
            if (data && data.trim() !== '') {
              buffer = await generateQRCodeBuffer(data, size);
            }
          }
          
          if (buffer) {
            doc.image(buffer, xPoints, yPoints, {
              width: widthElementPoints,
              height: heightElementPoints
            });
          }
        } catch (error) {
          console.error("Error adding QR code to PDF:", error);
        }
      }
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// ============================================================================
// TEMPLATE CRUD ROUTES
// ============================================================================

// GET /api/label-designer/templates - List all templates for current tenant
router.get("/templates", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    const templates = await db
      .select()
      .from(labelTemplates)
      .where(eq(labelTemplates.tenantId, tenantId))
      .orderBy(desc(labelTemplates.createdAt));

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch templates" 
    });
  }
});

// GET /api/label-designer/templates/:id - Get specific template
router.get("/templates/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const templateId = parseInt(req.params.id);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (isNaN(templateId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid template ID" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    const template = await db
      .select()
      .from(labelTemplates)
      .where(
        and(
          eq(labelTemplates.id, templateId),
          eq(labelTemplates.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!template || template.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Template not found" 
      });
    }

    res.json({
      success: true,
      data: template[0]
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch template" 
    });
  }
});

// POST /api/label-designer/templates - Create new template
router.post("/templates", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    // Validate request body
    const templateData = insertLabelTemplateSchema.parse({
      ...req.body,
      tenantId
    });

    const newTemplate = await db
      .insert(labelTemplates)
      .values(templateData)
      .returning();

    res.status(201).json({
      success: true,
      data: newTemplate[0]
    });
  } catch (error) {
    console.error("Error creating template:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: "Validation failed",
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to create template" 
    });
  }
});

// PUT /api/label-designer/templates/:id - Update existing template
router.put("/templates/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const templateId = parseInt(req.params.id);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (isNaN(templateId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid template ID" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    // Check if template exists and belongs to tenant
    const existingTemplate = await db
      .select()
      .from(labelTemplates)
      .where(
        and(
          eq(labelTemplates.id, templateId),
          eq(labelTemplates.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existingTemplate || existingTemplate.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Template not found" 
      });
    }

    // Validate and update
    const updateData = updateLabelTemplateSchema.parse({
      ...req.body,
      updatedAt: new Date()
    });

    // Remove tenantId from update data to prevent tampering
    delete (updateData as any).tenantId;

    const updatedTemplate = await db
      .update(labelTemplates)
      .set(updateData)
      .where(
        and(
          eq(labelTemplates.id, templateId),
          eq(labelTemplates.tenantId, tenantId)
        )
      )
      .returning();

    res.json({
      success: true,
      data: updatedTemplate[0]
    });
  } catch (error) {
    console.error("Error updating template:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: "Validation failed",
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to update template" 
    });
  }
});

// DELETE /api/label-designer/templates/:id - Delete template
router.delete("/templates/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const templateId = parseInt(req.params.id);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (isNaN(templateId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid template ID" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    // Check if template exists and belongs to tenant
    const existingTemplate = await db
      .select()
      .from(labelTemplates)
      .where(
        and(
          eq(labelTemplates.id, templateId),
          eq(labelTemplates.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existingTemplate || existingTemplate.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Template not found" 
      });
    }

    await db
      .delete(labelTemplates)
      .where(
        and(
          eq(labelTemplates.id, templateId),
          eq(labelTemplates.tenantId, tenantId)
        )
      );

    res.json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete template" 
    });
  }
});

// ============================================================================
// DEFAULT TEMPLATES - Etiquetas Padrão para Bijuterias/Semijoias
// ============================================================================

// Default templates data - 12 jewelry label templates
const DEFAULT_LABEL_TEMPLATES = [
  // 📏 ETIQUETAS ADESIVAS (Tipo Rolo) - Para impressoras térmicas
  {
    name: "Etiqueta Adesiva 65x10mm - Lunoze",
    description: "Etiqueta adesiva em rolo para impressora térmica - Lunoze (6,5cm x 1,0cm). Ideal para bijuterias pequenas.",
    category: "adesiva",
    tags: ["rolo", "térmica", "adesiva", "pequena", "bijuteria", "lunoze"],
    widthMm: 65,
    heightMm: 10,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Etiqueta Adesiva 95x12mm - Adeconex BOPP Perolado",
    description: "Etiqueta adesiva BOPP perolado - Adeconex (9,5cm x 1,2cm). Material premium resistente à água.",
    category: "adesiva",
    tags: ["rolo", "térmica", "adesiva", "bopp", "perolado", "adeconex", "premium"],
    widthMm: 95,
    heightMm: 12,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Etiqueta Adesiva 100x15mm - Vision Impressos BOPP Branco Pérola",
    description: "Etiqueta BOPP branco pérola - Vision Impressos (10,0cm x 1,5cm). Acabamento sofisticado.",
    category: "adesiva",
    tags: ["rolo", "térmica", "adesiva", "bopp", "branco", "pérola", "vision", "grande"],
    widthMm: 100,
    heightMm: 15,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Etiqueta Adesiva 67x12mm - Pontografica (Com Aba)",
    description: "Etiqueta adesiva com aba de proteção - Pontografica (6,7cm x 1,2cm). Aba facilita manuseio.",
    category: "adesiva",
    tags: ["rolo", "térmica", "adesiva", "aba", "proteção", "pontografica"],
    widthMm: 67,
    heightMm: 12,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Etiqueta Adesiva 36x14mm - Reidosestojos (Pequena Encaixe)",
    description: "Etiqueta pequena de encaixe - Reidosestojos (3,6cm x 1,4cm). Perfeita para peças delicadas.",
    category: "adesiva",
    tags: ["rolo", "térmica", "adesiva", "pequena", "encaixe", "reidosestojos", "delicada"],
    widthMm: 36,
    heightMm: 14,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },

  // 🏷️ TAGS/CARTELAS Para brincos
  {
    name: "Tag Brincos 48x88mm - VP Design (6 Furos)",
    description: "Tag de papel para brincos com 6 furos - VP Design (4,8cm x 8,8cm). Suporta 3 pares de brincos.",
    category: "tag-brincos",
    tags: ["tag", "papel", "brincos", "6-furos", "vp-design", "cartela"],
    widthMm: 48,
    heightMm: 88,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Tag Brincos 42.5x48mm - Criarepromover (Brincos Maiores)",
    description: "Tag para brincos maiores - Criarepromover (4,25cm x 4,8cm). Ideal para argolas e brincos grandes.",
    category: "tag-brincos",
    tags: ["tag", "papel", "brincos", "grande", "argola", "criarepromover"],
    widthMm: 42.5,
    heightMm: 48,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Tag Brincos 40x48mm - FuturaIM (Padrão Pequeno)",
    description: "Tag padrão pequeno para brincos - FuturaIM (4,0cm x 4,8cm). Tamanho versátil para diversos estilos.",
    category: "tag-brincos",
    tags: ["tag", "papel", "brincos", "pequeno", "padrão", "futuraim", "versátil"],
    widthMm: 40,
    heightMm: 48,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Tag Brincos 48x80mm - FuturaIM (Padrão Médio)",
    description: "Tag padrão médio para brincos - FuturaIM (4,8cm x 8,0cm). Espaço para logo e informações.",
    category: "tag-brincos",
    tags: ["tag", "papel", "brincos", "médio", "padrão", "futuraim", "logo"],
    widthMm: 48,
    heightMm: 80,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },

  // 🏷️ Para colares e acessórios
  {
    name: "Tag Colares 88x98mm - FuturaIM",
    description: "Tag grande para colares - FuturaIM (8,8cm x 9,8cm). Perfeita para colares e correntes.",
    category: "tag-colares",
    tags: ["tag", "papel", "colares", "grande", "correntes", "futuraim"],
    widthMm: 88,
    heightMm: 98,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Tag Bijuteria 55x90mm - Inbapel (Padrão)",
    description: "Tag bijuteria padrão - Inbapel (5,5cm x 9,0cm). Uso geral para diversas bijuterias.",
    category: "tag-bijuteria",
    tags: ["tag", "papel", "bijuteria", "padrão", "inbapel", "uso-geral"],
    widthMm: 55,
    heightMm: 90,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  },
  {
    name: "Tag Bijuteria 47x60mm - Inbapel (Menor)",
    description: "Tag bijuteria menor - Inbapel (4,7cm x 6,0cm). Compacta e econômica.",
    category: "tag-bijuteria",
    tags: ["tag", "papel", "bijuteria", "pequeno", "menor", "inbapel", "econômica"],
    widthMm: 47,
    heightMm: 60,
    designData: { objects: [], background: "#ffffff", version: "5.3.0" }
  }
];

// POST /api/label-designer/templates/seed-defaults - Seed default templates for tenant
router.post("/templates/seed-defaults", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    // Check if tenant already has default templates
    const existingTemplates = await db
      .select()
      .from(labelTemplates)
      .where(eq(labelTemplates.tenantId, tenantId));

    // Only seed if tenant has no templates or if forced
    const force = req.body?.force === true;
    if (existingTemplates.length > 0 && !force) {
      return res.json({
        success: true,
        message: `Tenant already has ${existingTemplates.length} templates. Use force=true to add defaults anyway.`,
        existingCount: existingTemplates.length,
        skipped: true
      });
    }

    // Insert default templates
    const insertedTemplates = [];
    for (const template of DEFAULT_LABEL_TEMPLATES) {
      try {
        const newTemplate = await db
          .insert(labelTemplates)
          .values({
            ...template,
            tenantId,
            isPublic: true
          })
          .returning();
        insertedTemplates.push(newTemplate[0]);
      } catch (error) {
        console.error(`Error inserting template ${template.name}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Successfully seeded ${insertedTemplates.length} default templates`,
      count: insertedTemplates.length,
      templates: insertedTemplates.map(t => ({ id: t.id, name: t.name }))
    });
  } catch (error) {
    console.error("Error seeding default templates:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to seed default templates" 
    });
  }
});

// GET /api/label-designer/templates/defaults - Get list of available default templates
router.get("/templates/defaults", async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: DEFAULT_LABEL_TEMPLATES.map((t, index) => ({
        id: `default-${index}`,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        widthMm: parseFloat(t.widthMm),
        heightMm: parseFloat(t.heightMm)
      }))
    });
  } catch (error) {
    console.error("Error getting default templates:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to get default templates" 
    });
  }
});

// ============================================================================
// ZPL GENERATION FOR ZEBRA THERMAL PRINTERS
// ============================================================================

// Helper function to convert elements to ZPL commands
// DPI: 152 = 6 dots/mm, 203 = 8 dots/mm, 300 = ~12 dots/mm, 600 = ~24 dots/mm
function generateZplFromElements(widthMm: number, heightMm: number, elements: any[], dpi: number = 203): string {
  // Calculate dots per mm based on DPI (1 inch = 25.4mm)
  const DOTS_PER_MM = dpi / 25.4;
  const widthDots = Math.round(widthMm * DOTS_PER_MM);
  const heightDots = Math.round(heightMm * DOTS_PER_MM);

  // Start ZPL command
  let zpl = '^XA\n'; // Start format
  zpl += `^PW${widthDots}\n`; // Set label width
  zpl += `^LL${heightDots}\n`; // Set label length

  // Process each element
  for (const element of elements) {
    try {
      const xDots = Math.round(element.x * DOTS_PER_MM);
      const yDots = Math.round(element.y * DOTS_PER_MM);

      if (element.type === 'text') {
        // Text element
        // ^FO = Field Origin (position)
        // ^A0 = Font selection (0 = default)
        // ^FD = Field Data
        const fontSize = element.fontSize || 12;
        const fontHeight = Math.round(fontSize * 3); // Approximate conversion
        
        zpl += `^FO${xDots},${yDots}\n`;
        zpl += `^A0N,${fontHeight},${fontHeight}\n`;
        zpl += `^FD${element.text || ''}\n`;
        zpl += '^FS\n'; // Field Separator
      } 
      else if (element.type === 'barcode') {
        // Barcode element (CODE128)
        // ^BY = Bar Code Field Default
        // ^BCN = Code 128 barcode
        const height = element.height ? Math.round(element.height * DOTS_PER_MM) : 100;
        const moduleWidth = 2; // Width of narrow bar
        
        zpl += `^FO${xDots},${yDots}\n`;
        zpl += `^BY${moduleWidth}\n`;
        zpl += `^BCN,${height},Y,N,N\n`; // Code128, height, print interpretation line
        zpl += `^FD${element.value || element.text || ''}\n`;
        zpl += '^FS\n';
      }
      else if (element.type === 'qrcode') {
        // QR Code element
        // ^BQN = QR Code
        const magnification = element.scale || 5; // QR code size multiplier
        
        zpl += `^FO${xDots},${yDots}\n`;
        zpl += `^BQN,2,${magnification}\n`; // QR, error correction, magnification
        zpl += `^FDQA,${element.value || element.text || ''}\n`;
        zpl += '^FS\n';
      }
      else if (element.type === 'image' && element.data) {
        // Image element - This is complex and would require image-to-ZPL conversion
        // For now, add a comment indicating where image conversion would go
        zpl += `^FO${xDots},${yDots}\n`;
        zpl += `^FX Image element - conversion needed\n`;
        // In production, you would convert the image to ^GF (Graphic Field) format
        // This requires bitmap conversion which is beyond this basic implementation
      }
    } catch (error) {
      console.error('Error converting element to ZPL:', error);
    }
  }

  // End ZPL command
  zpl += '^XZ\n'; // End format

  return zpl;
}

// POST /api/label-designer/generate-zpl - Generate ZPL code for Zebra printers
router.post("/generate-zpl", async (req: Request, res: Response) => {
  try {
    // Validate request body with Zod
    const validatedData = generateZplSchema.parse(req.body);
    const { widthMm, heightMm, dpi, elements } = validatedData;

    // Use DPI from request or default to 203
    const effectiveDpi = dpi || 203;
    const zplCode = generateZplFromElements(widthMm, heightMm, elements, effectiveDpi);

    res.json({
      success: true,
      zpl: zplCode,
      info: {
        widthMm,
        heightMm,
        elementCount: elements.length,
        dpi: effectiveDpi,
        dotsPerMm: Math.round((effectiveDpi / 25.4) * 100) / 100
      }
    });
  } catch (error) {
    console.error("Error generating ZPL:", error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: "Validation failed",
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to generate ZPL" 
    });
  }
});

export default router;
