/**
 * Response Compression Middleware
 * Reduces bandwidth usage for Supabase and Cloudflare
 * Optimized for FREE tier limits
 */

import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const brotliAsync = promisify(zlib.brotliCompress);

/**
 * Compression settings
 */
const COMPRESSION_CONFIG = {
  threshold: 1024, // Only compress if response > 1KB
  level: 6, // Balance between speed and compression (1-9)
  
  // MIME types to compress
  compressibleTypes: [
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/xml',
    'text/xml',
    'text/plain',
    'image/svg+xml',
  ],
  
  // Paths to always compress
  compressPaths: [
    '/api/dashboard',
    '/api/forms',
    '/api/workspace',
    '/api/products',
    '/api/calendar',
  ],
};

/**
 * Paths to skip compression (known issues with async compression)
 */
const SKIP_COMPRESSION_PATHS = [
  '/api/leads-pipeline',
];

/**
 * Check if response should be compressed
 */
function shouldCompress(req: Request, res: Response): boolean {
  // Skip specific paths that have issues with async compression
  // Use originalUrl for full path including router mounts
  const fullPath = req.originalUrl || req.path;
  if (SKIP_COMPRESSION_PATHS.some(path => fullPath.startsWith(path))) {
    return false;
  }
  
  // Skip if client doesn't support compression
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('br')) {
    return false;
  }
  
  // Check content type
  const contentType = res.getHeader('content-type')?.toString() || '';
  const isCompressibleType = COMPRESSION_CONFIG.compressibleTypes.some(
    type => contentType.includes(type)
  );
  
  // Check path
  const isCompressiblePath = COMPRESSION_CONFIG.compressPaths.some(
    path => req.path.startsWith(path)
  );
  
  return isCompressibleType || isCompressiblePath;
}

/**
 * Smart compression middleware
 * Uses Brotli for browsers that support it, fallback to Gzip
 */
export function smartCompression(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send.bind(res);
  
  res.send = function(body: any): Response {
    // Skip if shouldn't compress
    if (!shouldCompress(req, res)) {
      return originalSend(body);
    }
    
    // Skip if body is too small
    const bodySize = Buffer.byteLength(body || '', 'utf8');
    if (bodySize < COMPRESSION_CONFIG.threshold) {
      return originalSend(body);
    }
    
    // Get best compression method
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const useBrotli = acceptEncoding.includes('br');
    const useGzip = acceptEncoding.includes('gzip');
    
    if (!useBrotli && !useGzip) {
      return originalSend(body);
    }
    
    // Compress asynchronously
    (async () => {
      try {
        let compressed: Buffer;
        let encoding: string;
        
        if (useBrotli) {
          compressed = await brotliAsync(body, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: COMPRESSION_CONFIG.level,
            },
          });
          encoding = 'br';
        } else {
          compressed = await gzipAsync(body, {
            level: COMPRESSION_CONFIG.level,
          });
          encoding = 'gzip';
        }
        
        const compressedSize = compressed.length;
        const ratio = ((1 - compressedSize / bodySize) * 100).toFixed(1);
        
        console.log(
          `🗜️ Compressed ${req.path}: ${bodySize}B → ${compressedSize}B (${ratio}% savings, ${encoding})`
        );
        
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Content-Length', compressedSize.toString());
        res.setHeader('Vary', 'Accept-Encoding');
        
        originalSend.call(res, compressed);
      } catch (error) {
        console.error('Compression error:', error);
        // Fallback to uncompressed
        originalSend.call(res, body);
      }
    })();
    
    // Return response object for chaining
    return res;
  };
  
  next();
}

/**
 * Compression stats tracker
 */
class CompressionStats {
  private totalSaved = 0;
  private requestsCompressed = 0;
  
  track(originalSize: number, compressedSize: number): void {
    this.totalSaved += (originalSize - compressedSize);
    this.requestsCompressed++;
  }
  
  getStats() {
    return {
      totalSavedBytes: this.totalSaved,
      totalSavedMB: (this.totalSaved / (1024 * 1024)).toFixed(2),
      requestsCompressed: this.requestsCompressed,
      averageSavings: this.requestsCompressed > 0
        ? ((this.totalSaved / this.requestsCompressed) / 1024).toFixed(2) + ' KB'
        : '0 KB',
    };
  }
  
  reset(): void {
    this.totalSaved = 0;
    this.requestsCompressed = 0;
  }
}

export const compressionStats = new CompressionStats();

/**
 * JSON minification for API responses
 * Removes whitespace from JSON responses
 */
export function jsonMinify(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any): Response {
    // Minify JSON (no whitespace)
    const minified = JSON.stringify(body);
    const original = JSON.stringify(body, null, 2);
    
    const saved = Buffer.byteLength(original) - Buffer.byteLength(minified);
    if (saved > 0) {
      console.log(`🔨 JSON minified: saved ${saved}B`);
    }
    
    // Set content type and send minified
    res.setHeader('Content-Type', 'application/json');
    return originalJson.call(res, body);
  };
  
  next();
}
