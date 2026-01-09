/**
 * Cloudflare Cache Headers Middleware
 * Optimizes caching for Cloudflare Free Tier
 * Reduces Supabase bandwidth by serving cached content from CF edge
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Cache Control rules for different content types
 */
const CACHE_RULES = {
  // Static assets - cache agressivamente
  static: {
    pattern: /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/,
    maxAge: 31536000, // 1 year
    sMaxAge: 31536000,
    immutable: true,
  },
  
  // HTML - cache curto com revalidação
  html: {
    pattern: /\.html$/,
    maxAge: 300, // 5 min
    sMaxAge: 300,
    mustRevalidate: true,
  },
  
  // API responses - cache médio
  api: {
    pattern: /^\/api\/(forms|products|workspace)/,
    maxAge: 300, // 5 min
    sMaxAge: 600, // 10 min no edge
    staleWhileRevalidate: 300,
  },
  
  // Dashboard data - cache curto
  dashboard: {
    pattern: /^\/api\/dashboard/,
    maxAge: 60, // 1 min
    sMaxAge: 120, // 2 min no edge
    staleWhileRevalidate: 60,
  },
  
  // Real-time data - no cache
  realtime: {
    pattern: /^\/api\/(whatsapp\/messages|evolution\/status)/,
    maxAge: 0,
    noCache: true,
  },
};

/**
 * Build Cache-Control header string
 */
function buildCacheControl(rule: any): string {
  if (rule.noCache) {
    return 'no-cache, no-store, must-revalidate';
  }
  
  const parts: string[] = [];
  
  if (rule.maxAge !== undefined) {
    parts.push(`max-age=${rule.maxAge}`);
  }
  
  if (rule.sMaxAge !== undefined) {
    parts.push(`s-maxage=${rule.sMaxAge}`);
  }
  
  if (rule.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${rule.staleWhileRevalidate}`);
  }
  
  if (rule.immutable) {
    parts.push('immutable');
  }
  
  if (rule.mustRevalidate) {
    parts.push('must-revalidate');
  }
  
  // Always set public for Cloudflare caching (except auth routes)
  if (!rule.noCache) {
    parts.push('public');
  }
  
  return parts.join(', ');
}

/**
 * Cloudflare Cache Middleware
 */
export function cloudflareCache(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;
  
  // Skip auth routes
  if (path.includes('/auth') || path.includes('/login') || path.includes('/logout')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }
  
  // Find matching rule
  let matchedRule = null;
  
  for (const [name, rule] of Object.entries(CACHE_RULES)) {
    if (rule.pattern.test(path)) {
      matchedRule = rule;
      console.log(`✅ CF Cache rule matched: ${name} for ${path}`);
      break;
    }
  }
  
  // Apply cache headers only for successful responses
  if (matchedRule) {
    // Intercept response to conditionally apply cache
    const originalSend = res.send.bind(res);
    res.send = function(body: any): Response {
      // Only cache successful responses (2xx), not errors
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cacheControl = buildCacheControl(matchedRule);
        res.setHeader('Cache-Control', cacheControl);
        
        // Cloudflare specific headers
        if (!matchedRule.noCache) {
          res.setHeader('CDN-Cache-Control', cacheControl);
          res.setHeader('Vary', 'Accept-Encoding, Authorization');
        }
        
        console.log(`📦 CF Cache-Control: ${cacheControl}`);
      } else {
        // Don't cache error responses
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        console.log(`⚠️ CF No-Cache for error response: ${res.statusCode}`);
      }
      
      return originalSend(body);
    };
  }
  
  next();
}

/**
 * ETag support for conditional requests
 * Reduces bandwidth by returning 304 Not Modified
 */
export function etagSupport(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send.bind(res);
  
  res.send = function(body: any): Response {
    // Skip for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return originalSend(body);
    }
    
    // Generate simple ETag (hash of content length + modified time)
    const etag = `"${Buffer.byteLength(body || '')}-${Date.now()}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has same version
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === etag) {
      console.log(`✅ 304 Not Modified: ${req.path}`);
      res.status(304);
      return originalSend('');
    }
    
    return originalSend(body);
  };
  
  next();
}

/**
 * Cloudflare cache bypass for testing
 */
export function bypassCloudflareCache(req: Request, res: Response, next: NextFunction): void {
  // Check for bypass query param
  if (req.query.nocache === '1') {
    res.setHeader('Cache-Control', 'no-cache, no-store');
    console.log(`⚠️ CF Cache bypass: ${req.path}`);
  }
  
  next();
}

/**
 * Preflight cache for OPTIONS requests
 */
export function preflightCache(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    // Cache preflight for 24h
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    console.log(`✅ Preflight cached: ${req.path}`);
  }
  
  next();
}
