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

  // 1. Servir arquivos estáticos com cache inteligente
  // Assets com hash (vite) podem ter cache longo
  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
      // Arquivos HTML não devem ter cache para garantir atualizações
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } 
      // Arquivos de mídia e código (JS/CSS)
      else if (filepath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // 2. Proteção contra erro MIME Type (404 em vez de HTML para arquivos inexistentes)
  // Se a requisição parece ser para um arquivo mas não foi servida acima, ela não existe.
  app.get('*', (req, res, next) => {
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|map)$/)) {
      return res.status(404).send('File not found');
    }
    next();
  });

  // 3. Fallback SPA (apenas para rotas de navegação)
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
