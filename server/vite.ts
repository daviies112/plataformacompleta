import { createServer as createViteServer } from "vite";
import type { Express } from "express";
import type { Server } from "http";
import express from "express";
import fs from "fs";
import path from "path";

export function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.log('[VITE] Creating Vite server...');
  
  // Configure HMR for Replit environment
  // In middleware mode, we attach HMR to the existing HTTP server
  // For Replit, we configure the client to connect via WSS to the proxy
  const isReplit = process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN;
  
  console.log('[VITE] Environment:', isReplit ? 'Replit' : 'Local');
  console.log('[VITE] REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN || 'not set');
  
  // Add timeout protection
  const vitePromise = createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        server: server, // Use the existing HTTP server for HMR websocket
        timeout: 120000,
      },
      allowedHosts: true,
    },
    appType: "spa",
    clearScreen: false,
    logLevel: 'info',
  });
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Vite server creation timed out after 30 seconds')), 30000);
  });
  
  const vite = await Promise.race([vitePromise, timeoutPromise]);
  console.log('[VITE] Vite server created successfully');

  // Use Vite middleware only for non-API routes
  // API routes are registered BEFORE this middleware in server/index.ts, so they have priority
  app.use(vite.middlewares);
  
  // HTML fallback handler for SPA - skip API routes!
  app.use((req, res, next) => {
    // CRITICAL: Skip API routes - they're already handled by Express routers
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found - reached SPA fallback' });
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(process.cwd(), "index.html");
      let template = fs.readFileSync(clientTemplate, "utf-8");
      vite.transformIndexHtml(url, template).then(transformedTemplate => {
        // Headers for iframe embedding (Replit preview) and no-cache
        const headers: Record<string, string> = { 
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        };
        
        // Allow iframe embedding for Replit preview
        const isReplit = process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN;
        if (isReplit) {
          headers["Content-Security-Policy"] = "frame-ancestors 'self' *.replit.com *.replit.dev *.repl.co *.picard.replit.dev replit.com replit.dev";
        }
        
        res.status(200).set(headers).end(transformedTemplate);
      }).catch(e => {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      });
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
