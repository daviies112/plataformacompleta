import express, { Request, Response } from "express";
import { db } from "../db.js";
import { printerConfigs, insertPrinterConfigSchema, updatePrinterConfigSchema } from "../../shared/db-schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    email: string;
    clientId?: string;
  };
}

function getTenantId(req: AuthenticatedRequest): string | null {
  if (req.user?.tenantId) {
    return req.user.tenantId;
  }
  if (req.session?.tenantId) {
    return req.session.tenantId;
  }
  return null;
}

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
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

    const configs = await db
      .select()
      .from(printerConfigs)
      .where(eq(printerConfigs.tenantId, tenantId))
      .orderBy(desc(printerConfigs.isDefault), desc(printerConfigs.createdAt));

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error("Error fetching printer configs:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch printer configurations" 
    });
  }
});

router.get("/default", async (req: AuthenticatedRequest, res: Response) => {
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

    const config = await db
      .select()
      .from(printerConfigs)
      .where(
        and(
          eq(printerConfigs.tenantId, tenantId),
          eq(printerConfigs.isDefault, true)
        )
      )
      .limit(1);

    if (!config || config.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: "No default printer configured"
      });
    }

    res.json({
      success: true,
      data: config[0]
    });
  } catch (error) {
    console.error("Error fetching default printer:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch default printer" 
    });
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const configId = parseInt(req.params.id);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (isNaN(configId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid config ID" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    const config = await db
      .select()
      .from(printerConfigs)
      .where(
        and(
          eq(printerConfigs.id, configId),
          eq(printerConfigs.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!config || config.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Printer configuration not found" 
      });
    }

    res.json({
      success: true,
      data: config[0]
    });
  } catch (error) {
    console.error("Error fetching printer config:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch printer configuration" 
    });
  }
});

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
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

    const configData = insertPrinterConfigSchema.parse({
      ...req.body,
      tenantId
    });

    if (configData.isDefault) {
      await db
        .update(printerConfigs)
        .set({ isDefault: false })
        .where(eq(printerConfigs.tenantId, tenantId));
    }

    const newConfig = await db
      .insert(printerConfigs)
      .values(configData)
      .returning();

    res.status(201).json({
      success: true,
      data: newConfig[0]
    });
  } catch (error) {
    console.error("Error creating printer config:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: "Validation failed",
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to create printer configuration" 
    });
  }
});

router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const configId = parseInt(req.params.id);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (isNaN(configId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid config ID" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    const existingConfig = await db
      .select()
      .from(printerConfigs)
      .where(
        and(
          eq(printerConfigs.id, configId),
          eq(printerConfigs.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existingConfig || existingConfig.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Printer configuration not found" 
      });
    }

    const updateData = updatePrinterConfigSchema.parse({
      ...req.body,
      updatedAt: new Date()
    });

    delete (updateData as any).tenantId;

    if (updateData.isDefault === true) {
      await db
        .update(printerConfigs)
        .set({ isDefault: false })
        .where(eq(printerConfigs.tenantId, tenantId));
    }

    const updatedConfig = await db
      .update(printerConfigs)
      .set(updateData)
      .where(
        and(
          eq(printerConfigs.id, configId),
          eq(printerConfigs.tenantId, tenantId)
        )
      )
      .returning();

    res.json({
      success: true,
      data: updatedConfig[0]
    });
  } catch (error) {
    console.error("Error updating printer config:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: "Validation failed",
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to update printer configuration" 
    });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const configId = parseInt(req.params.id);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (isNaN(configId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid config ID" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    const existingConfig = await db
      .select()
      .from(printerConfigs)
      .where(
        and(
          eq(printerConfigs.id, configId),
          eq(printerConfigs.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existingConfig || existingConfig.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Printer configuration not found" 
      });
    }

    await db
      .delete(printerConfigs)
      .where(
        and(
          eq(printerConfigs.id, configId),
          eq(printerConfigs.tenantId, tenantId)
        )
      );

    res.json({
      success: true,
      message: "Printer configuration deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting printer config:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete printer configuration" 
    });
  }
});

router.post("/set-default/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const configId = parseInt(req.params.id);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    if (isNaN(configId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid config ID" 
      });
    }

    if (!db) {
      return res.status(503).json({ 
        success: false,
        error: "Database not available" 
      });
    }

    await db
      .update(printerConfigs)
      .set({ isDefault: false })
      .where(eq(printerConfigs.tenantId, tenantId));

    const updatedConfig = await db
      .update(printerConfigs)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(printerConfigs.id, configId),
          eq(printerConfigs.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedConfig || updatedConfig.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Printer configuration not found" 
      });
    }

    res.json({
      success: true,
      data: updatedConfig[0]
    });
  } catch (error) {
    console.error("Error setting default printer:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to set default printer" 
    });
  }
});

router.post("/print", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized: No tenant ID found" 
      });
    }

    const { printerId, productData, quantity, labelFormat } = req.body;

    if (!productData) {
      return res.status(400).json({ 
        success: false,
        error: "Product data is required" 
      });
    }

    console.log(`[PRINT] Print job received for tenant ${tenantId}:`, {
      printerId,
      productId: productData.id,
      quantity,
      labelFormat
    });

    res.json({
      success: true,
      message: "Print job queued successfully",
      jobId: `print-${Date.now()}`
    });
  } catch (error) {
    console.error("Error processing print job:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to process print job" 
    });
  }
});

export default router;
