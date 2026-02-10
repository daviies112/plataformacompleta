/**
 * Utilitário de Normalização de Telefone
 * Garante matching perfeito entre WhatsApp e Banco de Dados
 */

/**
 * Normaliza telefone para formato padrão +5531999999999
 * 
 * Target format: +55 (country) + DDD (2 digits) + 9 + number (8 digits) = 13 digits + prefix
 * 
 * @param phone - Telefone em qualquer formato
 * @returns Telefone normalizado no formato +5531999999999
 * 
 * @example
 * normalizePhone('31999972368') // '+5531999972368'
 * normalizePhone('5531999972368') // '+5531999972368'
 * normalizePhone('553192267220@s.whatsapp.net') // '+5531992267220'
 * normalizePhone('+55 31 99997-2368') // '+5531999972368'
 * normalizePhone('3192267220') // '+5531992267220' (adds 55 and 9)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // 1. First remove @s.whatsapp.net suffix (before removing non-digits)
  let numero = phone.replace(/@.*$/, '');
  
  // 2. Remove ALL non-digit characters
  numero = numero.replace(/\D/g, '');
  
  // 3. Remove leading zeros
  numero = numero.replace(/^0+/, '');
  
  // 4. Normalize based on length to always get: 55 + DDD(2) + 9 + number(8) = 13 digits
  if (numero.length === 8) {
    // 8 digits: local number without DDD - can't determine DDD, return as-is with warning
    console.warn(`[PHONE] 8 dígitos, DDD desconhecido: ${numero} (original: ${phone})`);
    return '+' + numero;
  }
  
  if (numero.length === 9) {
    // 9 digits: local number with 9 but no DDD - can't determine DDD, return as-is with warning
    console.warn(`[PHONE] 9 dígitos, DDD desconhecido: ${numero} (original: ${phone})`);
    return '+' + numero;
  }
  
  if (numero.length === 10) {
    // 10 digits: DDD + 8 digits (no 9th digit)
    // 3192267220 → 5531992267220
    const ddd = numero.substring(0, 2);
    const resto = numero.substring(2);
    numero = '55' + ddd + '9' + resto;
  } else if (numero.length === 11) {
    // 11 digits: DDD + 9 digits (has the 9th digit), just add 55
    // 31992267220 → 5531992267220
    numero = '55' + numero;
  } else if (numero.length === 12 && numero.startsWith('55')) {
    // 12 digits starting with 55: country + DDD + 8 digits (no 9th digit)
    // 553192267220 → 5531992267220 (add 9 after DDD)
    const ddd = numero.substring(2, 4);
    const resto = numero.substring(4);
    numero = '55' + ddd + '9' + resto;
  } else if (numero.length === 13 && numero.startsWith('55')) {
    // 13 digits starting with 55: already complete, no change needed
    // 5531992267220 → 5531992267220
  } else {
    // Other cases - log warning but still return
    console.warn(`[PHONE] Tamanho inesperado: ${numero.length} dígitos (original: ${phone})`);
  }
  
  // 5. Always return with + prefix
  return '+' + numero;
}

/**
 * Extrai telefone de ID do WhatsApp
 * 
 * @param whatsappId - ID do WhatsApp (ex: 5531999999999@s.whatsapp.net)
 * @returns Telefone normalizado
 * 
 * @example
 * extractPhoneFromWhatsAppId('5531999972368@s.whatsapp.net') // '+5531999972368'
 */
export function extractPhoneFromWhatsAppId(whatsappId: string): string {
  const numero = whatsappId.replace(/@.*$/, '');
  return normalizePhone(numero);
}

/**
 * Compara se dois telefones são iguais (após normalização)
 * 
 * @param phone1 - Primeiro telefone
 * @param phone2 - Segundo telefone
 * @returns true se os telefones são iguais
 * 
 * @example
 * phonesMatch('31999972368', '5531999972368@s.whatsapp.net') // true
 * phonesMatch('+55 31 99997-2368', '5531999972368') // true
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const norm1 = normalizePhone(phone1);
  const norm2 = normalizePhone(phone2);
  return norm1 === norm2;
}

/**
 * Valida se um telefone brasileiro está no formato correto
 * 
 * @param phone - Telefone a validar
 * @returns true se válido
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  
  // Remove o +
  const digits = normalized.replace(/^\+/, '');
  
  // Deve ter 13 dígitos (55 + DDD + número)
  if (digits.length !== 13) return false;
  
  // Deve começar com 55 (Brasil)
  if (!digits.startsWith('55')) return false;
  
  // DDD deve ser válido (11-99)
  const ddd = parseInt(digits.substring(2, 4));
  if (ddd < 11 || ddd > 99) return false;
  
  // Nono dígito deve ser 9 para celulares
  const ninthDigit = digits.charAt(4);
  if (ninthDigit !== '9') return false;
  
  return true;
}

/**
 * Formata telefone para exibição
 * 
 * @param phone - Telefone normalizado
 * @returns Telefone formatado (ex: +55 31 99997-2368)
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/^\+/, '');
  
  if (digits.length === 13) {
    // +55 31 99997-2368
    return `+${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 9)}-${digits.substring(9)}`;
  }
  
  return normalized;
}
