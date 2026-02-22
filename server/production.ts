import express from "express";
import type { Express } from "express";
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
export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Add CORS headers for uploads directory to allow crossOrigin image loading
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.use(express.static(distPath));
  app.use((req, res, next) => {
    // CRITICAL: Skip static assets - prevent returning HTML for JS/CSS files (MIME type error)
    const staticExtensions = /\.(js|mjs|jsx|ts|tsx|css|png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot|map|wasm)$/;
    if (req.path.match(staticExtensions)) {
      console.log(`[PROD-STATIC-PROTECTION] Missing asset: ${req.method} ${req.path}`);
      return res.status(404).set("Content-Type", "text/plain").send("Asset not found");
    }

    if (req.path.startsWith('/api/')) {
      return next();
    }

    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
