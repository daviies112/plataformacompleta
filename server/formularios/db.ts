/**
 * Formularios Database Connection
 * 
 * SUPABASE-ONLY MODE:
 * Uses the same configuration system as server/db.ts
 * Supports running without database in "configuration mode"
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "../../shared/db-schema";
import { getDatabaseUrl } from "../lib/supabaseFileConfig";

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let connectionAttempted = false;

function initializeDatabase(): void {
  if (connectionAttempted) return;
  connectionAttempted = true;
  
  const databaseUrl = getDatabaseUrl();
  
  if (databaseUrl) {
    try {
      pool = new pg.Pool({ 
        connectionString: databaseUrl,
        max: 10,
        connectionTimeoutMillis: 10000
      });
      db = drizzle(pool, { schema });
      console.log('✅ Formulários database connection configured');
    } catch (error) {
      console.warn('⚠️  Formulários database connection failed:', error);
      pool = null;
      db = null;
    }
  } else {
    console.log('ℹ️  Formulários: Aguardando configuração do Supabase');
  }
}

initializeDatabase();

export function isDatabaseConnected(): boolean {
  return db !== null && pool !== null;
}

export { db, pool };
