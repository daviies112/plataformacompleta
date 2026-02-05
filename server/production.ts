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

  // Servir arquivos estáticos com configuração de cache
  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filepath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // Fallback SPA - serve index.html para rotas que não são arquivos
  app.use((req, res, next) => {
    // Se a requisição parece ser um arquivo estático, retorna 404
    if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
      return res.status(404).send('File not found');
    }
    // Caso contrário, serve o index.html (SPA routing)
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
