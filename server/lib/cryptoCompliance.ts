import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";

function getEncryptionKey(): Buffer {
  const base64Key = process.env.CREDENTIALS_ENCRYPTION_KEY_BASE64;
  
  if (base64Key) {
    return Buffer.from(base64Key, 'base64').subarray(0, 32);
  }
  
  const rawKey = process.env.ENCRYPTION_KEY;
  if (rawKey) {
    return Buffer.from(rawKey.padEnd(32, "0").substring(0, 32));
  }
  
  if (process.env.NODE_ENV === "production") {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY_BASE64 or ENCRYPTION_KEY must be set in production");
  }
  
  return Buffer.from("default-dev-key-change-in-prod32");
}

const KEY_BUFFER = getEncryptionKey();

export function hashCPF(cpf: string): string {
  const normalized = cpf.replace(/\D/g, "");
  return createHash("sha256")
    .update(normalized)
    .digest("hex");
}

export function encryptCPF(cpf: string): string {
  const normalized = cpf.replace(/\D/g, "");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  
  let encrypted = cipher.update(normalized, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptCPF(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted data format");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  
  const decipher = createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
  
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, "").padStart(11, "0");
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  if (!/^\d+$/.test(cleaned)) return false;
  
  return true;
}

/**
 * Converts a string tenant_id to a deterministic UUID v5
 * This ensures "dev-user-1" always becomes the same UUID
 */
export function tenantIdToUUID(tenantId: string): string {
  // If already a valid UUID, return as-is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(tenantId)) {
    return tenantId;
  }
  
  // Create deterministic UUID from string using SHA-256
  const hash = createHash("sha256").update(tenantId).digest("hex");
  
  // Format as UUID v5 (8-4-4-4-12)
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "5" + hash.substring(13, 16), // Version 5
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20), // Variant
    hash.substring(20, 32)
  ].join("-");
}
