// Re-export schema from db-schema.ts for backwards compatibility
export * from "./db-schema";

// Utility function for formatting CPF numbers
export function formatCPF(cpf: unknown): string {
  if (cpf === null || cpf === undefined) return "N/A";
  const str = String(cpf);
  if (!str || str === "null" || str === "undefined") return "N/A";
  const numeric = str.replace(/\D/g, "");
  if (numeric.length !== 11) return str;
  return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${numeric.slice(9)}`;
}

// Additional types for compliance module
export type ComplianceStatus = "approved" | "rejected" | "pending" | "review" | "error";

// Types for Bigdatacorp process data
export interface BigdatacorpUpdate {
  Date?: string;
  Description?: string;
  Type?: string;
}

export interface BigdatacorpPetition {
  Date?: string;
  Description?: string;
  Type?: string;
}

export interface BigdatacorpParty {
  Name?: string;
  Type?: string;
  Document?: string;
}

export interface BigdatacorpDecision {
  Date?: string;
  Description?: string;
  Result?: string;
}

// Bank types for Pluggy integration
export interface Bank {
  id: string;
  name: string;
  code?: string;
  logo?: string;
}

export const BRAZILIAN_BANKS: Bank[] = [
  { id: "1", name: "Banco do Brasil", code: "001" },
  { id: "2", name: "Bradesco", code: "237" },
  { id: "3", name: "Caixa Econômica Federal", code: "104" },
  { id: "4", name: "Itaú Unibanco", code: "341" },
  { id: "5", name: "Santander Brasil", code: "033" },
  { id: "6", name: "Nubank", code: "260" },
  { id: "7", name: "Inter", code: "077" },
  { id: "8", name: "C6 Bank", code: "336" },
  { id: "9", name: "BTG Pactual", code: "208" },
  { id: "10", name: "Sicoob", code: "756" },
];
