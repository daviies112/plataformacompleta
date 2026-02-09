/**
 * CPF Validation and Formatting Utilities
 * Client-side implementation for CPF handling
 */

/**
 * Remove all non-numeric characters from CPF
 */
export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/**
 * Format CPF with dots and dash (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  const cleaned = normalizeCPF(cpf);
  if (cleaned.length !== 11) return cpf;
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Validate CPF using check digits algorithm
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = normalizeCPF(cpf);
  
  // Must have exactly 11 digits
  if (cleaned.length !== 11) return false;
  
  // Reject known invalid patterns (all same digit)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(9))) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}
