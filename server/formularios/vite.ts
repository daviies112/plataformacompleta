import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

export async function setupVite(app: Express, server: any) {
  console.log("  📝 Creating Vite server...");
  const configPath = path.resolve(__dirname, "..", "vite.config.ts");
  console.log(`  📝 Using config from: ${configPath}`);
  
  const vite = await createViteServer({
    configFile: configPath,
    server: { 
      middlewareMode: true,
      hmr: false,
    },
    appType: "custom",
    clearScreen: false,
    logLevel: 'error',
  });

  console.log("  📝 Setting up Vite middlewares...");
  app.use(vite.middlewares);
  app.get(/.*/, async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientPath = path.resolve(__dirname, "..", "client_form");
      const template = await vite.transformIndexHtml(
        url,
        fs.readFileSync(path.resolve(clientPath, "index.html"), "utf-8")
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  console.log("  📝 Vite middleware setup complete");
  return server;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.get(/.*/, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
