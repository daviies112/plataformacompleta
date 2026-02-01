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
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;
  
  // Valida primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
}
